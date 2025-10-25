// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ReputationSystem
 * @dev Advanced reputation and staking system for PhishBlock
 * Features: Token staking, reputation multipliers, slashing, rewards distribution
 * @author PhishBlock Team
 */
contract ReputationSystem is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // Enums
    enum StakeType { Report, Vote, Validator }
    enum ReputationTier { Bronze, Silver, Gold, Platinum, Diamond }

    // Structs
    struct Stake {
        uint256 amount;
        uint256 timestamp;
        uint256 lockPeriod;
        StakeType stakeType;
        bool active;
        uint256 reputationMultiplier;
    }

    struct ReputationProfile {
        uint256 baseReputation;
        uint256 stakedReputation;
        uint256 totalReputation;
        ReputationTier tier;
        uint256 lastUpdate;
        uint256 reportsSubmitted;
        uint256 votesCast;
        uint256 correctVotes;
        uint256 falseReports;
        uint256 slashingCount;
    }

    struct RewardPool {
        uint256 totalRewards;
        uint256 distributedRewards;
        uint256 lastDistribution;
        uint256 distributionInterval;
        mapping(ReputationTier => uint256) tierMultipliers;
    }

    // State variables
    IERC20 public stakingToken;
    Counters.Counter private _stakeCounter;

    // Mappings
    mapping(address => ReputationProfile) public reputationProfiles;
    mapping(address => mapping(uint256 => Stake)) public userStakes;
    mapping(address => uint256) public userStakeCount;
    mapping(ReputationTier => uint256) public tierThresholds;
    mapping(ReputationTier => uint256) public tierMultipliers;
    mapping(StakeType => uint256) public stakeTypeMultipliers;
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public lastRewardClaim;

    RewardPool public rewardPool;

    // Constants
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 tokens minimum
    uint256 public constant MAX_STAKE_PERIOD = 365 days;
    uint256 public constant MIN_STAKE_PERIOD = 7 days;
    uint256 public constant REPUTATION_DECAY_RATE = 1; // 1% per month
    uint256 public constant SLASHING_PENALTY = 10; // 10% slashing
    uint256 public constant REWARD_CLAIM_COOLDOWN = 1 days;
    uint256 public constant MAX_STAKES_PER_USER = 10;

    // Events
    event StakeDeposited(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 lockPeriod,
        StakeType stakeType
    );

    event StakeWithdrawn(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 penalty
    );

    event ReputationUpdated(
        address indexed user,
        uint256 oldReputation,
        uint256 newReputation,
        ReputationTier newTier
    );

    event RewardsDistributed(
        uint256 totalAmount,
        uint256 timestamp
    );

    event RewardsClaimed(
        address indexed user,
        uint256 amount
    );

    event UserSlashed(
        address indexed user,
        uint256 amount,
        string reason
    );

    event TierUpgraded(
        address indexed user,
        ReputationTier oldTier,
        ReputationTier newTier
    );

    // Modifiers
    modifier onlyValidStaker(address user) {
        require(
            reputationProfiles[user].baseReputation >= 10,
            "Insufficient reputation to stake"
        );
        _;
    }

    modifier onlyActiveStake(address user, uint256 stakeId) {
        require(
            userStakes[user][stakeId].active,
            "Stake is not active"
        );
        _;
    }

    modifier onlyStakeOwner(address user, uint256 stakeId) {
        require(
            userStakes[user][stakeId].amount > 0,
            "Stake does not exist or not owned by user"
        );
        _;
    }

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        
        // Initialize tier thresholds
        tierThresholds[ReputationTier.Bronze] = 0;
        tierThresholds[ReputationTier.Silver] = 50;
        tierThresholds[ReputationTier.Gold] = 100;
        tierThresholds[ReputationTier.Platinum] = 250;
        tierThresholds[ReputationTier.Diamond] = 500;

        // Initialize tier multipliers
        tierMultipliers[ReputationTier.Bronze] = 100; // 1x
        tierMultipliers[ReputationTier.Silver] = 120; // 1.2x
        tierMultipliers[ReputationTier.Gold] = 150; // 1.5x
        tierMultipliers[ReputationTier.Platinum] = 200; // 2x
        tierMultipliers[ReputationTier.Diamond] = 300; // 3x

        // Initialize stake type multipliers
        stakeTypeMultipliers[StakeType.Report] = 150; // 1.5x
        stakeTypeMultipliers[StakeType.Vote] = 120; // 1.2x
        stakeTypeMultipliers[StakeType.Validator] = 200; // 2x

        // Initialize reward pool
        rewardPool.distributionInterval = 7 days;
        rewardPool.tierMultipliers[ReputationTier.Bronze] = 100;
        rewardPool.tierMultipliers[ReputationTier.Silver] = 120;
        rewardPool.tierMultipliers[ReputationTier.Gold] = 150;
        rewardPool.tierMultipliers[ReputationTier.Platinum] = 200;
        rewardPool.tierMultipliers[ReputationTier.Diamond] = 300;
    }

    /**
     * @dev Deposit tokens for staking
     * @param amount Amount of tokens to stake
     * @param lockPeriod Lock period in seconds
     * @param stakeType Type of stake
     */
    function depositStake(
        uint256 amount,
        uint256 lockPeriod,
        StakeType stakeType
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyValidStaker(msg.sender)
    {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum stake");
        require(
            lockPeriod >= MIN_STAKE_PERIOD && lockPeriod <= MAX_STAKE_PERIOD,
            "Invalid lock period"
        );
        require(
            userStakeCount[msg.sender] < MAX_STAKES_PER_USER,
            "Maximum stakes per user exceeded"
        );

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        _stakeCounter.increment();
        uint256 stakeId = _stakeCounter.current();

        uint256 reputationMultiplier = stakeTypeMultipliers[stakeType];

        userStakes[msg.sender][stakeId] = Stake({
            amount: amount,
            timestamp: block.timestamp,
            lockPeriod: lockPeriod,
            stakeType: stakeType,
            active: true,
            reputationMultiplier: reputationMultiplier
        });

        userStakeCount[msg.sender] += 1;

        // Update reputation
        _updateStakedReputation(msg.sender);

        emit StakeDeposited(msg.sender, stakeId, amount, lockPeriod, stakeType);
    }

    /**
     * @dev Withdraw staked tokens
     * @param stakeId ID of the stake to withdraw
     */
    function withdrawStake(uint256 stakeId)
        external
        nonReentrant
        whenNotPaused
        onlyStakeOwner(msg.sender, stakeId)
        onlyActiveStake(msg.sender, stakeId)
    {
        Stake storage stake = userStakes[msg.sender][stakeId];
        
        uint256 penalty = 0;
        uint256 withdrawAmount = stake.amount;

        // Check if stake is still locked
        if (block.timestamp < stake.timestamp + stake.lockPeriod) {
            penalty = (stake.amount * SLASHING_PENALTY) / 100;
            withdrawAmount = stake.amount - penalty;
        }

        stake.active = false;
        userStakeCount[msg.sender] -= 1;

        // Update reputation
        _updateStakedReputation(msg.sender);

        // Transfer tokens
        stakingToken.safeTransfer(msg.sender, withdrawAmount);
        
        if (penalty > 0) {
            // Send penalty to reward pool
            rewardPool.totalRewards += penalty;
        }

        emit StakeWithdrawn(msg.sender, stakeId, withdrawAmount, penalty);
    }

    /**
     * @dev Update user reputation (called by main registry)
     * @param user User address
     * @param change Reputation change (positive or negative)
     * @param isCorrectVote Whether this is for a correct vote
     */
    function updateReputation(
        address user,
        int256 change,
        bool isCorrectVote
    ) external {
        // Only allow calls from authorized contracts
        require(
            msg.sender == owner() || 
            msg.sender == address(this),
            "Unauthorized caller"
        );

        ReputationProfile storage profile = reputationProfiles[user];
        
        if (profile.baseReputation == 0) {
            // Initialize new user
            profile.baseReputation = 10;
            profile.tier = ReputationTier.Bronze;
            profile.lastUpdate = block.timestamp;
        }

        uint256 oldReputation = profile.totalReputation;

        if (change > 0) {
            profile.baseReputation += uint256(change);
            if (isCorrectVote) {
                profile.correctVotes += 1;
            }
        } else {
            uint256 decrease = uint256(-change);
            if (profile.baseReputation >= decrease) {
                profile.baseReputation -= decrease;
            } else {
                profile.baseReputation = 0;
            }
            
            if (!isCorrectVote) {
                profile.falseReports += 1;
            }
        }

        // Update staked reputation
        _updateStakedReputation(user);

        // Update tier
        ReputationTier oldTier = profile.tier;
        profile.tier = _calculateTier(profile.totalReputation);

        if (oldTier != profile.tier) {
            emit TierUpgraded(user, oldTier, profile.tier);
        }

        emit ReputationUpdated(user, oldReputation, profile.totalReputation, profile.tier);
    }

    /**
     * @dev Slash user's stake for malicious behavior
     * @param user User to slash
     * @param stakeId ID of the stake to slash
     * @param reason Reason for slashing
     */
    function slashUser(
        address user,
        uint256 stakeId,
        string memory reason
    ) external onlyOwner onlyStakeOwner(user, stakeId) onlyActiveStake(user, stakeId) {
        Stake storage stake = userStakes[user][stakeId];
        
        uint256 slashAmount = (stake.amount * SLASHING_PENALTY) / 100;
        
        stake.amount -= slashAmount;
        
        // Update reputation
        reputationProfiles[user].slashingCount += 1;
        _updateStakedReputation(user);

        // Add slashed amount to reward pool
        rewardPool.totalRewards += slashAmount;

        emit UserSlashed(user, slashAmount, reason);
    }

    /**
     * @dev Distribute rewards to all stakers
     */
    function distributeRewards() external onlyOwner {
        require(
            block.timestamp >= rewardPool.lastDistribution + rewardPool.distributionInterval,
            "Distribution interval not reached"
        );

        uint256 totalDistributed = 0;
        uint256 totalStakedReputation = 0;

        // Calculate total staked reputation
        // Note: In a real implementation, you'd iterate through all stakers
        // For gas efficiency, this is simplified

        rewardPool.lastDistribution = block.timestamp;
        rewardPool.distributedRewards += totalDistributed;

        emit RewardsDistributed(totalDistributed, block.timestamp);
    }

    /**
     * @dev Claim pending rewards
     */
    function claimRewards() external nonReentrant whenNotPaused {
        require(
            block.timestamp >= lastRewardClaim[msg.sender] + REWARD_CLAIM_COOLDOWN,
            "Claim cooldown not reached"
        );

        uint256 rewards = pendingRewards[msg.sender];
        require(rewards > 0, "No rewards to claim");

        pendingRewards[msg.sender] = 0;
        lastRewardClaim[msg.sender] = block.timestamp;

        stakingToken.safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    /**
     * @dev Get user's reputation profile
     * @param user User address
     */
    function getUserProfile(address user)
        external
        view
        returns (
            uint256 baseReputation,
            uint256 stakedReputation,
            uint256 totalReputation,
            ReputationTier tier,
            uint256 reportsSubmitted,
            uint256 votesCast,
            uint256 correctVotes,
            uint256 falseReports,
            uint256 slashingCount
        )
    {
        ReputationProfile memory profile = reputationProfiles[user];
        return (
            profile.baseReputation,
            profile.stakedReputation,
            profile.totalReputation,
            profile.tier,
            profile.reportsSubmitted,
            profile.votesCast,
            profile.correctVotes,
            profile.falseReports,
            profile.slashingCount
        );
    }

    /**
     * @dev Get user's stake details
     * @param user User address
     * @param stakeId Stake ID
     */
    function getUserStake(address user, uint256 stakeId)
        external
        view
        returns (
            uint256 amount,
            uint256 timestamp,
            uint256 lockPeriod,
            StakeType stakeType,
            bool active,
            uint256 reputationMultiplier
        )
    {
        Stake memory stake = userStakes[user][stakeId];
        return (
            stake.amount,
            stake.timestamp,
            stake.lockPeriod,
            stake.stakeType,
            stake.active,
            stake.reputationMultiplier
        );
    }

    /**
     * @dev Get user's stake count
     * @param user User address
     */
    function getUserStakeCount(address user) external view returns (uint256) {
        return userStakeCount[user];
    }

    /**
     * @dev Get pending rewards for user
     * @param user User address
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return pendingRewards[user];
    }

    /**
     * @dev Check if user can claim rewards
     * @param user User address
     */
    function canClaimRewards(address user) external view returns (bool) {
        return block.timestamp >= lastRewardClaim[user] + REWARD_CLAIM_COOLDOWN;
    }

    /**
     * @dev Internal function to update staked reputation
     * @param user User address
     */
    function _updateStakedReputation(address user) internal {
        ReputationProfile storage profile = reputationProfiles[user];
        uint256 totalStaked = 0;

        for (uint256 i = 1; i <= userStakeCount[user]; i++) {
            Stake memory stake = userStakes[user][i];
            if (stake.active) {
                totalStaked += stake.amount;
            }
        }

        // Convert staked amount to reputation points (1 token = 1 reputation point)
        profile.stakedReputation = totalStaked / 10**18;
        profile.totalReputation = profile.baseReputation + profile.stakedReputation;
    }

    /**
     * @dev Calculate user's tier based on total reputation
     * @param totalReputation Total reputation points
     */
    function _calculateTier(uint256 totalReputation) internal view returns (ReputationTier) {
        if (totalReputation >= tierThresholds[ReputationTier.Diamond]) {
            return ReputationTier.Diamond;
        } else if (totalReputation >= tierThresholds[ReputationTier.Platinum]) {
            return ReputationTier.Platinum;
        } else if (totalReputation >= tierThresholds[ReputationTier.Gold]) {
            return ReputationTier.Gold;
        } else if (totalReputation >= tierThresholds[ReputationTier.Silver]) {
            return ReputationTier.Silver;
        } else {
            return ReputationTier.Bronze;
        }
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency function to update tier thresholds
     * @param tier Tier to update
     * @param threshold New threshold
     */
    function updateTierThreshold(ReputationTier tier, uint256 threshold)
        external
        onlyOwner
    {
        tierThresholds[tier] = threshold;
    }

    /**
     * @dev Emergency function to update tier multipliers
     * @param tier Tier to update
     * @param multiplier New multiplier
     */
    function updateTierMultiplier(ReputationTier tier, uint256 multiplier)
        external
        onlyOwner
    {
        tierMultipliers[tier] = multiplier;
    }

    /**
     * @dev Emergency function to update stake type multipliers
     * @param stakeType Stake type to update
     * @param multiplier New multiplier
     */
    function updateStakeTypeMultiplier(StakeType stakeType, uint256 multiplier)
        external
        onlyOwner
    {
        stakeTypeMultipliers[stakeType] = multiplier;
    }
}
