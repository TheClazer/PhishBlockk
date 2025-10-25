// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title PhishBlockRegistry
 * @dev Enhanced decentralized registry for phishing URLs and scam wallet addresses
 * Features: Reentrancy protection, pausable, rate limiting, reputation-based voting
 * @author PhishBlock Team
 */
contract PhishBlockRegistry is ReentrancyGuard, Pausable, Ownable {
    using Counters for Counters.Counter;

    // Enums
    enum ReportStatus { Pending, Verified, Disputed, Resolved }
    enum EvidenceType { URL, Wallet, Screenshot, Document }

    // Structs
    struct Report {
        bytes32 reportId;
        address reporter;
        string targetUrl;
        string targetWallet;
        string description;
        string ipfsHash;
        EvidenceType evidenceType;
        ReportStatus status;
        uint256 timestamp;
        uint256 upvotes;
        uint256 downvotes;
        uint256 disputeCount;
        bool exists;
    }

    struct Vote {
        bool hasVoted;
        bool isUpvote;
        uint256 timestamp;
        uint256 reputationWeight;
    }

    struct Dispute {
        address disputer;
        string reason;
        uint256 timestamp;
        bool resolved;
    }

    // State variables
    Counters.Counter private _reportCounter;
    Counters.Counter private _disputeCounter;

    // Mappings
    mapping(bytes32 => Report) public reports;
    mapping(bytes32 => mapping(address => Vote)) public votes;
    mapping(bytes32 => Dispute[]) public disputes;
    mapping(address => uint256) public userReputation;
    mapping(address => uint256) public lastSubmissionTime;
    mapping(address => uint256) public submissionCount;
    mapping(string => bool) public urlBlacklist;
    mapping(string => bool) public walletBlacklist;

    // Constants
    uint256 public constant MIN_REPUTATION_TO_VOTE = 10;
    uint256 public constant MIN_REPUTATION_TO_REPORT = 5;
    uint256 public constant RATE_LIMIT_WINDOW = 1 hours;
    uint256 public constant MAX_SUBMISSIONS_PER_WINDOW = 5;
    uint256 public constant VOTE_TIMEOUT = 7 days;
    uint256 public constant DISPUTE_TIMEOUT = 14 days;
    uint256 public constant REPUTATION_REWARD_REPORT = 2;
    uint256 public constant REPUTATION_REWARD_VOTE = 1;
    uint256 public constant REPUTATION_PENALTY_FALSE_REPORT = 5;

    // Events
    event ReportSubmitted(
        bytes32 indexed reportId,
        address indexed reporter,
        string targetUrl,
        string targetWallet,
        EvidenceType evidenceType,
        string ipfsHash
    );

    event VoteCast(
        bytes32 indexed reportId,
        address indexed voter,
        bool isUpvote,
        uint256 reputationWeight,
        uint256 newScore
    );

    event ReportStatusChanged(
        bytes32 indexed reportId,
        ReportStatus oldStatus,
        ReportStatus newStatus
    );

    event DisputeRaised(
        bytes32 indexed reportId,
        address indexed disputer,
        string reason
    );

    event ReputationUpdated(
        address indexed user,
        int256 change,
        uint256 newReputation
    );

    event BlacklistUpdated(
        string indexed target,
        bool isBlacklisted,
        bool isUrl
    );

    // Modifiers
    modifier onlyValidReporter() {
        require(
            userReputation[msg.sender] >= MIN_REPUTATION_TO_REPORT,
            "Insufficient reputation to report"
        );
        _;
    }

    modifier onlyValidVoter() {
        require(
            userReputation[msg.sender] >= MIN_REPUTATION_TO_VOTE,
            "Insufficient reputation to vote"
        );
        _;
    }

    modifier rateLimited() {
        require(
            block.timestamp - lastSubmissionTime[msg.sender] >= RATE_LIMIT_WINDOW ||
            submissionCount[msg.sender] < MAX_SUBMISSIONS_PER_WINDOW,
            "Rate limit exceeded"
        );
        _;
    }

    modifier onlyExistingReport(bytes32 reportId) {
        require(reports[reportId].exists, "Report does not exist");
        _;
    }

    modifier onlyActiveReport(bytes32 reportId) {
        require(
            reports[reportId].status == ReportStatus.Pending ||
            reports[reportId].status == ReportStatus.Verified,
            "Report is not active"
        );
        _;
    }

    constructor() Ownable(msg.sender) {
        // Initialize with some reputation for the owner
        userReputation[msg.sender] = 100;
    }

    /**
     * @dev Submit a new phishing report
     * @param targetUrl The suspicious URL (can be empty string)
     * @param targetWallet The suspicious wallet address (can be empty string)
     * @param description Description of the phishing attempt
     * @param ipfsHash IPFS hash of evidence
     * @param evidenceType Type of evidence provided
     */
    function submitReport(
        string memory targetUrl,
        string memory targetWallet,
        string memory description,
        string memory ipfsHash,
        EvidenceType evidenceType
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyValidReporter 
        rateLimited 
    {
        require(
            bytes(targetUrl).length > 0 || bytes(targetWallet).length > 0,
            "Must provide either URL or wallet address"
        );
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");

        // Check if URL or wallet is already blacklisted
        if (bytes(targetUrl).length > 0) {
            require(!urlBlacklist[targetUrl], "URL already blacklisted");
        }
        if (bytes(targetWallet).length > 0) {
            require(!walletBlacklist[targetWallet], "Wallet already blacklisted");
        }

        _reportCounter.increment();
        bytes32 reportId = keccak256(
            abi.encodePacked(
                msg.sender,
                targetUrl,
                targetWallet,
                description,
                ipfsHash,
                block.timestamp,
                _reportCounter.current()
            )
        );

        reports[reportId] = Report({
            reportId: reportId,
            reporter: msg.sender,
            targetUrl: targetUrl,
            targetWallet: targetWallet,
            description: description,
            ipfsHash: ipfsHash,
            evidenceType: evidenceType,
            status: ReportStatus.Pending,
            timestamp: block.timestamp,
            upvotes: 0,
            downvotes: 0,
            disputeCount: 0,
            exists: true
        });

        // Update submission tracking
        if (block.timestamp - lastSubmissionTime[msg.sender] >= RATE_LIMIT_WINDOW) {
            submissionCount[msg.sender] = 1;
        } else {
            submissionCount[msg.sender] += 1;
        }
        lastSubmissionTime[msg.sender] = block.timestamp;

        emit ReportSubmitted(
            reportId,
            msg.sender,
            targetUrl,
            targetWallet,
            evidenceType,
            ipfsHash
        );
    }

    /**
     * @dev Cast a vote on a report
     * @param reportId The ID of the report to vote on
     * @param isUpvote True for upvote, false for downvote
     */
    function vote(bytes32 reportId, bool isUpvote)
        external
        nonReentrant
        whenNotPaused
        onlyValidVoter
        onlyExistingReport(reportId)
        onlyActiveReport(reportId)
    {
        Report storage report = reports[reportId];
        Vote storage userVote = votes[reportId][msg.sender];

        require(
            block.timestamp <= report.timestamp + VOTE_TIMEOUT,
            "Voting period has expired"
        );

        uint256 reputationWeight = userReputation[msg.sender];

        if (userVote.hasVoted) {
            // User is changing their vote
            if (userVote.isUpvote != isUpvote) {
                // Remove old vote
                if (userVote.isUpvote) {
                    report.upvotes -= userVote.reputationWeight;
                } else {
                    report.downvotes -= userVote.reputationWeight;
                }

                // Apply new vote
                if (isUpvote) {
                    report.upvotes += reputationWeight;
                } else {
                    report.downvotes += reputationWeight;
                }

                userVote.isUpvote = isUpvote;
                userVote.reputationWeight = reputationWeight;

                emit VoteCast(
                    reportId,
                    msg.sender,
                    isUpvote,
                    reputationWeight,
                    int256(report.upvotes) - int256(report.downvotes)
                );
            }
        } else {
            // New vote
            userVote.hasVoted = true;
            userVote.isUpvote = isUpvote;
            userVote.timestamp = block.timestamp;
            userVote.reputationWeight = reputationWeight;

            if (isUpvote) {
                report.upvotes += reputationWeight;
            } else {
                report.downvotes += reputationWeight;
            }

            emit VoteCast(
                reportId,
                msg.sender,
                isUpvote,
                reputationWeight,
                int256(report.upvotes) - int256(report.downvotes)
            );
        }
    }

    /**
     * @dev Raise a dispute against a report
     * @param reportId The ID of the report to dispute
     * @param reason Reason for the dispute
     */
    function raiseDispute(bytes32 reportId, string memory reason)
        external
        nonReentrant
        whenNotPaused
        onlyValidVoter
        onlyExistingReport(reportId)
    {
        require(bytes(reason).length > 0, "Dispute reason cannot be empty");
        require(
            msg.sender != reports[reportId].reporter,
            "Cannot dispute your own report"
        );

        Report storage report = reports[reportId];
        require(
            block.timestamp <= report.timestamp + DISPUTE_TIMEOUT,
            "Dispute period has expired"
        );

        disputes[reportId].push(Dispute({
            disputer: msg.sender,
            reason: reason,
            timestamp: block.timestamp,
            resolved: false
        }));

        report.disputeCount += 1;

        emit DisputeRaised(reportId, msg.sender, reason);
    }

    /**
     * @dev Update report status (admin only)
     * @param reportId The ID of the report
     * @param newStatus The new status
     */
    function updateReportStatus(bytes32 reportId, ReportStatus newStatus)
        external
        onlyOwner
        onlyExistingReport(reportId)
    {
        Report storage report = reports[reportId];
        ReportStatus oldStatus = report.status;
        report.status = newStatus;

        emit ReportStatusChanged(reportId, oldStatus, newStatus);

        // Update reputation based on status change
        if (newStatus == ReportStatus.Verified) {
            _updateReputation(report.reporter, int256(REPUTATION_REWARD_REPORT));
        } else if (newStatus == ReportStatus.Disputed) {
            _updateReputation(report.reporter, -int256(REPUTATION_PENALTY_FALSE_REPORT));
        }
    }

    /**
     * @dev Add URL or wallet to blacklist
     * @param target The URL or wallet address
     * @param isUrl True if target is URL, false if wallet
     */
    function addToBlacklist(string memory target, bool isUrl)
        external
        onlyOwner
    {
        require(bytes(target).length > 0, "Target cannot be empty");

        if (isUrl) {
            urlBlacklist[target] = true;
        } else {
            walletBlacklist[target] = true;
        }

        emit BlacklistUpdated(target, true, isUrl);
    }

    /**
     * @dev Remove URL or wallet from blacklist
     * @param target The URL or wallet address
     * @param isUrl True if target is URL, false if wallet
     */
    function removeFromBlacklist(string memory target, bool isUrl)
        external
        onlyOwner
    {
        require(bytes(target).length > 0, "Target cannot be empty");

        if (isUrl) {
            urlBlacklist[target] = false;
        } else {
            walletBlacklist[target] = false;
        }

        emit BlacklistUpdated(target, false, isUrl);
    }

    /**
     * @dev Get report details
     * @param reportId The ID of the report
     */
    function getReport(bytes32 reportId)
        external
        view
        onlyExistingReport(reportId)
        returns (
            address reporter,
            string memory targetUrl,
            string memory targetWallet,
            string memory description,
            string memory ipfsHash,
            EvidenceType evidenceType,
            ReportStatus status,
            uint256 timestamp,
            uint256 upvotes,
            uint256 downvotes,
            uint256 disputeCount
        )
    {
        Report memory report = reports[reportId];
        return (
            report.reporter,
            report.targetUrl,
            report.targetWallet,
            report.description,
            report.ipfsHash,
            report.evidenceType,
            report.status,
            report.timestamp,
            report.upvotes,
            report.downvotes,
            report.disputeCount
        );
    }

    /**
     * @dev Get user's vote on a report
     * @param reportId The ID of the report
     * @param voter The voter's address
     */
    function getUserVote(bytes32 reportId, address voter)
        external
        view
        returns (
            bool hasVoted,
            bool isUpvote,
            uint256 timestamp,
            uint256 reputationWeight
        )
    {
        Vote memory userVote = votes[reportId][voter];
        return (
            userVote.hasVoted,
            userVote.isUpvote,
            userVote.timestamp,
            userVote.reputationWeight
        );
    }

    /**
     * @dev Get disputes for a report
     * @param reportId The ID of the report
     */
    function getDisputes(bytes32 reportId)
        external
        view
        onlyExistingReport(reportId)
        returns (Dispute[] memory)
    {
        return disputes[reportId];
    }

    /**
     * @dev Get total number of reports
     */
    function getReportCount() external view returns (uint256) {
        return _reportCounter.current();
    }

    /**
     * @dev Get user reputation
     * @param user The user's address
     */
    function getUserReputation(address user) external view returns (uint256) {
        return userReputation[user];
    }

    /**
     * @dev Check if URL is blacklisted
     * @param url The URL to check
     */
    function isUrlBlacklisted(string memory url) external view returns (bool) {
        return urlBlacklist[url];
    }

    /**
     * @dev Check if wallet is blacklisted
     * @param wallet The wallet address to check
     */
    function isWalletBlacklisted(string memory wallet) external view returns (bool) {
        return walletBlacklist[wallet];
    }

    /**
     * @dev Internal function to update user reputation
     * @param user The user's address
     * @param change The reputation change (positive or negative)
     */
    function _updateReputation(address user, int256 change) internal {
        uint256 currentReputation = userReputation[user];
        if (change > 0) {
            userReputation[user] = currentReputation + uint256(change);
        } else {
            uint256 decrease = uint256(-change);
            if (currentReputation >= decrease) {
                userReputation[user] = currentReputation - decrease;
            } else {
                userReputation[user] = 0;
            }
        }

        emit ReputationUpdated(user, change, userReputation[user]);
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
     * @dev Emergency function to update reputation (admin only)
     * @param user The user's address
     * @param newReputation The new reputation value
     */
    function emergencyUpdateReputation(address user, uint256 newReputation)
        external
        onlyOwner
    {
        uint256 oldReputation = userReputation[user];
        userReputation[user] = newReputation;
        
        emit ReputationUpdated(
            user,
            int256(newReputation) - int256(oldReputation),
            newReputation
        );
    }
}
