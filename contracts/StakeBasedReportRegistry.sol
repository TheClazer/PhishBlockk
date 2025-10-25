// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title StakeBasedReportRegistry
 * @dev Manages stake-based phishing report submissions with community validation
 */
contract StakeBasedReportRegistry is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    // Constants
    uint256 public constant REPORT_STAKE = 0.01 ether; // $30 at current prices
    uint256 public constant VOTING_STAKE = 0.005 ether; // $15 at current prices
    uint256 public constant VALIDATOR_REWARD = 0.001 ether; // $3 per validator
    uint256 public constant REPORTER_REWARD = 0.005 ether; // $15 reward for valid reports
    uint256 public constant MIN_VALIDATORS = 3;
    uint256 public constant MAX_VALIDATORS = 5;
    uint256 public constant VOTING_PERIOD = 7 days;
    
    // Counters
    Counters.Counter private _reportIds;
    Counters.Counter private _validatorIds;
    
    // Enums
    enum ReportStatus { Pending, Validated, Rejected, Expired }
    enum VoteType { None, Valid, Invalid }
    
    // Structs
    struct Report {
        uint256 id;
        string reportType; // "phishing_url" or "scam_wallet"
        string targetValue; // URL or wallet address
        string description;
        string reportHash;
        address reporter;
        uint256 stakeAmount;
        uint256 timestamp;
        uint256 votingDeadline;
        ReportStatus status;
        uint256 validVotes;
        uint256 invalidVotes;
        mapping(address => VoteType) votes;
        mapping(address => uint256) validatorStakes;
        address[] validators;
    }
    
    struct Validator {
        uint256 id;
        address validatorAddress;
        uint256 reputation;
        uint256 totalValidations;
        uint256 correctValidations;
        bool isActive;
        uint256 registrationTime;
    }
    
    // Mappings
    mapping(uint256 => Report) public reports;
    mapping(address => Validator) public validators;
    mapping(address => uint256[]) public userReports;
    mapping(address => uint256[]) public validatorReports;
    
    // Events
    event ReportSubmitted(uint256 indexed reportId, address indexed reporter, uint256 stakeAmount);
    event VoteCast(uint256 indexed reportId, address indexed validator, VoteType vote, uint256 stakeAmount);
    event ReportValidated(uint256 indexed reportId, address indexed reporter, uint256 reward);
    event ReportRejected(uint256 indexed reportId, address indexed reporter, uint256 burnedStake);
    event ValidatorRegistered(address indexed validator, uint256 validatorId);
    event StakeWithdrawn(address indexed user, uint256 amount);
    
    // Modifiers
    modifier onlyActiveValidator() {
        require(validators[msg.sender].isActive, "Not an active validator");
        _;
    }
    
    modifier reportExists(uint256 reportId) {
        require(reportId <= _reportIds.current(), "Report does not exist");
        _;
    }
    
    modifier votingOpen(uint256 reportId) {
        require(block.timestamp <= reports[reportId].votingDeadline, "Voting period closed");
        require(reports[reportId].status == ReportStatus.Pending, "Report not pending");
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Register as a validator
     */
    function registerValidator() external {
        require(!validators[msg.sender].isActive, "Already registered as validator");
        
        _validatorIds.increment();
        uint256 validatorId = _validatorIds.current();
        
        validators[msg.sender] = Validator({
            id: validatorId,
            validatorAddress: msg.sender,
            reputation: 100, // Starting reputation
            totalValidations: 0,
            correctValidations: 0,
            isActive: true,
            registrationTime: block.timestamp
        });
        
        emit ValidatorRegistered(msg.sender, validatorId);
    }
    
    /**
     * @dev Submit a report with stake
     */
    function submitReportWithStake(
        string memory reportType,
        string memory targetValue,
        string memory description,
        string memory reportHash
    ) external payable nonReentrant {
        require(msg.value == REPORT_STAKE, "Incorrect stake amount");
        require(bytes(reportType).length > 0, "Report type required");
        require(bytes(targetValue).length > 0, "Target value required");
        require(bytes(description).length > 0, "Description required");
        
        _reportIds.increment();
        uint256 reportId = _reportIds.current();
        
        Report storage newReport = reports[reportId];
        newReport.id = reportId;
        newReport.reportType = reportType;
        newReport.targetValue = targetValue;
        newReport.description = description;
        newReport.reportHash = reportHash;
        newReport.reporter = msg.sender;
        newReport.stakeAmount = msg.value;
        newReport.timestamp = block.timestamp;
        newReport.votingDeadline = block.timestamp + VOTING_PERIOD;
        newReport.status = ReportStatus.Pending;
        newReport.validVotes = 0;
        newReport.invalidVotes = 0;
        
        userReports[msg.sender].push(reportId);
        
        emit ReportSubmitted(reportId, msg.sender, msg.value);
    }
    
    /**
     * @dev Vote on a report as a validator
     */
    function voteOnReport(uint256 reportId, bool isValid) 
        external 
        payable 
        onlyActiveValidator 
        reportExists(reportId) 
        votingOpen(reportId) 
        nonReentrant 
    {
        require(msg.value == VOTING_STAKE, "Incorrect voting stake amount");
        require(reports[reportId].votes[msg.sender] == VoteType.None, "Already voted");
        
        Report storage report = reports[reportId];
        
        // Add validator to report if not already added
        bool validatorExists = false;
        for (uint i = 0; i < report.validators.length; i++) {
            if (report.validators[i] == msg.sender) {
                validatorExists = true;
                break;
            }
        }
        if (!validatorExists) {
            report.validators.push(msg.sender);
        }
        
        // Record vote and stake
        report.votes[msg.sender] = isValid ? VoteType.Valid : VoteType.Invalid;
        report.validatorStakes[msg.sender] = msg.value;
        
        if (isValid) {
            report.validVotes++;
        } else {
            report.invalidVotes++;
        }
        
        validatorReports[msg.sender].push(reportId);
        
        emit VoteCast(reportId, msg.sender, isValid ? VoteType.Valid : VoteType.Invalid, msg.value);
        
        // Check if we have enough votes to finalize
        if (report.validators.length >= MIN_VALIDATORS) {
            _finalizeReport(reportId);
        }
    }
    
    /**
     * @dev Finalize a report based on votes
     */
    function _finalizeReport(uint256 reportId) internal {
        Report storage report = reports[reportId];
        
        require(report.validators.length >= MIN_VALIDATORS, "Not enough validators");
        
        bool isValid = report.validVotes > report.invalidVotes;
        
        if (isValid) {
            report.status = ReportStatus.Validated;
            
            // Return stake + reward to reporter
            uint256 totalReward = report.stakeAmount + REPORTER_REWARD;
            payable(report.reporter).transfer(totalReward);
            
            // Distribute validator rewards
            _distributeValidatorRewards(reportId);
            
            emit ReportValidated(reportId, report.reporter, totalReward);
        } else {
            report.status = ReportStatus.Rejected;
            
            // Burn/redistribute stake to validators
            _redistributeStake(reportId);
            
            emit ReportRejected(reportId, report.reporter, report.stakeAmount);
        }
        
        // Update validator reputation
        _updateValidatorReputation(reportId);
    }
    
    /**
     * @dev Distribute rewards to validators for correct votes
     */
    function _distributeValidatorRewards(uint256 reportId) internal {
        Report storage report = reports[reportId];
        
        for (uint i = 0; i < report.validators.length; i++) {
            address validator = report.validators[i];
            if (report.votes[validator] == VoteType.Valid) {
                // Return voting stake + reward
                uint256 totalReward = report.validatorStakes[validator] + VALIDATOR_REWARD;
                payable(validator).transfer(totalReward);
            } else {
                // Return only voting stake for incorrect votes
                payable(validator).transfer(report.validatorStakes[validator]);
            }
        }
    }
    
    /**
     * @dev Redistribute stake from rejected reports
     */
    function _redistributeStake(uint256 reportId) internal {
        Report storage report = reports[reportId];
        
        // Distribute reporter's stake among validators who voted correctly
        uint256 correctValidators = 0;
        for (uint i = 0; i < report.validators.length; i++) {
            if (report.votes[report.validators[i]] == VoteType.Invalid) {
                correctValidators++;
            }
        }
        
        if (correctValidators > 0) {
            uint256 stakePerValidator = report.stakeAmount / correctValidators;
            for (uint i = 0; i < report.validators.length; i++) {
                address validator = report.validators[i];
                if (report.votes[validator] == VoteType.Invalid) {
                    uint256 totalReward = report.validatorStakes[validator] + stakePerValidator;
                    payable(validator).transfer(totalReward);
                } else {
                    // Return voting stake for incorrect votes
                    payable(validator).transfer(report.validatorStakes[validator]);
                }
            }
        }
    }
    
    /**
     * @dev Update validator reputation based on vote accuracy
     */
    function _updateValidatorReputation(uint256 reportId) internal {
        Report storage report = reports[reportId];
        
        for (uint i = 0; i < report.validators.length; i++) {
            address validator = report.validators[i];
            Validator storage val = validators[validator];
            
            val.totalValidations++;
            
            // Determine if vote was correct based on final outcome
            bool voteCorrect = (report.status == ReportStatus.Validated && report.votes[validator] == VoteType.Valid) ||
                              (report.status == ReportStatus.Rejected && report.votes[validator] == VoteType.Invalid);
            
            if (voteCorrect) {
                val.correctValidations++;
                val.reputation = val.reputation + 1; // Increase reputation
            } else {
                val.reputation = val.reputation > 1 ? val.reputation - 1 : 1; // Decrease reputation
            }
        }
    }
    
    /**
     * @dev Get report details
     */
    function getReport(uint256 reportId) external view reportExists(reportId) returns (
        uint256 id,
        string memory reportType,
        string memory targetValue,
        string memory description,
        string memory reportHash,
        address reporter,
        uint256 stakeAmount,
        uint256 timestamp,
        uint256 votingDeadline,
        ReportStatus status,
        uint256 validVotes,
        uint256 invalidVotes,
        address[] memory validatorList
    ) {
        Report storage report = reports[reportId];
        return (
            report.id,
            report.reportType,
            report.targetValue,
            report.description,
            report.reportHash,
            report.reporter,
            report.stakeAmount,
            report.timestamp,
            report.votingDeadline,
            report.status,
            report.validVotes,
            report.invalidVotes,
            report.validators
        );
    }
    
    /**
     * @dev Get validator details
     */
    function getValidator(address validatorAddress) external view returns (
        uint256 id,
        address validatorAddr,
        uint256 reputation,
        uint256 totalValidations,
        uint256 correctValidations,
        bool isActive,
        uint256 registrationTime
    ) {
        Validator storage validator = validators[validatorAddress];
        return (
            validator.id,
            validator.validatorAddress,
            validator.reputation,
            validator.totalValidations,
            validator.correctValidations,
            validator.isActive,
            validator.registrationTime
        );
    }
    
    /**
     * @dev Get user's reports
     */
    function getUserReports(address user) external view returns (uint256[] memory) {
        return userReports[user];
    }
    
    /**
     * @dev Get validator's reports
     */
    function getValidatorReports(address validator) external view returns (uint256[] memory) {
        return validatorReports[validator];
    }
    
    /**
     * @dev Get total reports count
     */
    function getTotalReports() external view returns (uint256) {
        return _reportIds.current();
    }
    
    /**
     * @dev Get total validators count
     */
    function getTotalValidators() external view returns (uint256) {
        return _validatorIds.current();
    }
    
    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}

