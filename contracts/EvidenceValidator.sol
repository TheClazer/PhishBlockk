// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title EvidenceValidator
 * @dev Evidence validation and IPFS integration system for PhishBlock
 * Features: IPFS hash validation, evidence verification, content analysis, Pinata integration
 * @author PhishBlock Team
 */
contract EvidenceValidator is ReentrancyGuard, Pausable, Ownable {
    using Counters for Counters.Counter;

    // Enums
    enum EvidenceStatus { Pending, Validated, Rejected, UnderReview }
    enum EvidenceType { Screenshot, Document, URL, Wallet, Metadata }
    enum ValidationLevel { Basic, Standard, Advanced, Expert }

    // Structs
    struct Evidence {
        bytes32 evidenceId;
        address submitter;
        string ipfsHash;
        EvidenceType evidenceType;
        EvidenceStatus status;
        ValidationLevel validationLevel;
        uint256 timestamp;
        uint256 fileSize;
        string mimeType;
        string originalUrl;
        string description;
        bool exists;
        mapping(address => bool) validators;
        uint256 validationCount;
        uint256 positiveValidations;
        uint256 negativeValidations;
    }

    struct ValidationResult {
        address validator;
        bool isValid;
        string reason;
        uint256 timestamp;
        ValidationLevel level;
    }

    struct IPFSMetadata {
        string hash;
        uint256 size;
        string mimeType;
        string encoding;
        uint256 timestamp;
        bool verified;
    }

    struct ContentAnalysis {
        bool isPhishing;
        bool isMalicious;
        bool isSuspicious;
        uint256 confidenceScore;
        string[] detectedPatterns;
        string[] riskFactors;
    }

    // State variables
    Counters.Counter private _evidenceCounter;
    Counters.Counter private _validationCounter;

    // Mappings
    mapping(bytes32 => Evidence) public evidence;
    mapping(bytes32 => ValidationResult[]) public validationResults;
    mapping(bytes32 => IPFSMetadata) public ipfsMetadata;
    mapping(bytes32 => ContentAnalysis) public contentAnalysis;
    mapping(address => uint256) public validatorReputation;
    mapping(address => bool) public authorizedValidators;
    mapping(string => bool) public knownIPFSHashes;
    mapping(string => bool) public maliciousPatterns;
    mapping(string => bool) public suspiciousDomains;

    // Arrays
    bytes32[] public allEvidenceIds;
    address[] public validatorList;

    // Constants
    uint256 public constant MIN_VALIDATION_REPUTATION = 50;
    uint256 public constant MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    uint256 public constant MIN_VALIDATIONS_REQUIRED = 3;
    uint256 public constant VALIDATION_TIMEOUT = 7 days;
    uint256 public constant IPFS_HASH_LENGTH = 46; // Qm... format
    uint256 public constant REPUTATION_REWARD_VALIDATION = 2;
    uint256 public constant REPUTATION_PENALTY_WRONG_VALIDATION = 5;

    // Events
    event EvidenceSubmitted(
        bytes32 indexed evidenceId,
        address indexed submitter,
        string ipfsHash,
        EvidenceType evidenceType,
        uint256 fileSize
    );

    event EvidenceValidated(
        bytes32 indexed evidenceId,
        address indexed validator,
        bool isValid,
        string reason,
        ValidationLevel level
    );

    event EvidenceStatusChanged(
        bytes32 indexed evidenceId,
        EvidenceStatus oldStatus,
        EvidenceStatus newStatus
    );

    event IPFSMetadataUpdated(
        bytes32 indexed evidenceId,
        string hash,
        uint256 size,
        string mimeType
    );

    event ContentAnalysisUpdated(
        bytes32 indexed evidenceId,
        bool isPhishing,
        uint256 confidenceScore
    );

    event ValidatorAuthorized(
        address indexed validator,
        uint256 reputation
    );

    event ValidatorDeauthorized(
        address indexed validator
    );

    event MaliciousPatternAdded(
        string pattern,
        bool isActive
    );

    event SuspiciousDomainAdded(
        string domain,
        bool isActive
    );

    // Modifiers
    modifier onlyAuthorizedValidator() {
        require(
            authorizedValidators[msg.sender],
            "Not an authorized validator"
        );
        require(
            validatorReputation[msg.sender] >= MIN_VALIDATION_REPUTATION,
            "Insufficient validator reputation"
        );
        _;
    }

    modifier onlyExistingEvidence(bytes32 evidenceId) {
        require(evidence[evidenceId].exists, "Evidence does not exist");
        _;
    }

    modifier onlyPendingEvidence(bytes32 evidenceId) {
        require(
            evidence[evidenceId].status == EvidenceStatus.Pending ||
            evidence[evidenceId].status == EvidenceStatus.UnderReview,
            "Evidence is not pending validation"
        );
        _;
    }

    constructor() Ownable(msg.sender) {
        // Initialize owner as validator
        authorizedValidators[msg.sender] = true;
        validatorReputation[msg.sender] = 100;
        validatorList.push(msg.sender);

        // Initialize some malicious patterns
        maliciousPatterns["phishing"] = true;
        maliciousPatterns["scam"] = true;
        maliciousPatterns["fake"] = true;
        maliciousPatterns["steal"] = true;
        maliciousPatterns["hack"] = true;
    }

    /**
     * @dev Submit evidence for validation
     * @param ipfsHash IPFS hash of the evidence
     * @param evidenceType Type of evidence
     * @param fileSize Size of the file in bytes
     * @param mimeType MIME type of the file
     * @param originalUrl Original URL where evidence was found
     * @param description Description of the evidence
     */
    function submitEvidence(
        string memory ipfsHash,
        EvidenceType evidenceType,
        uint256 fileSize,
        string memory mimeType,
        string memory originalUrl,
        string memory description
    ) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(bytes(ipfsHash).length == IPFS_HASH_LENGTH, "Invalid IPFS hash length");
        require(fileSize <= MAX_FILE_SIZE, "File size exceeds maximum");
        require(fileSize > 0, "File size must be greater than 0");
        require(bytes(mimeType).length > 0, "MIME type cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(!knownIPFSHashes[ipfsHash], "IPFS hash already exists");

        _evidenceCounter.increment();
        bytes32 evidenceId = keccak256(
            abi.encodePacked(
                msg.sender,
                ipfsHash,
                evidenceType,
                fileSize,
                block.timestamp,
                _evidenceCounter.current()
            )
        );

        Evidence storage newEvidence = evidence[evidenceId];
        newEvidence.evidenceId = evidenceId;
        newEvidence.submitter = msg.sender;
        newEvidence.ipfsHash = ipfsHash;
        newEvidence.evidenceType = evidenceType;
        newEvidence.status = EvidenceStatus.Pending;
        newEvidence.validationLevel = ValidationLevel.Basic;
        newEvidence.timestamp = block.timestamp;
        newEvidence.fileSize = fileSize;
        newEvidence.mimeType = mimeType;
        newEvidence.originalUrl = originalUrl;
        newEvidence.description = description;
        newEvidence.exists = true;
        newEvidence.validationCount = 0;
        newEvidence.positiveValidations = 0;
        newEvidence.negativeValidations = 0;

        // Store IPFS metadata
        ipfsMetadata[evidenceId] = IPFSMetadata({
            hash: ipfsHash,
            size: fileSize,
            mimeType: mimeType,
            encoding: "base58",
            timestamp: block.timestamp,
            verified: false
        });

        knownIPFSHashes[ipfsHash] = true;
        allEvidenceIds.push(evidenceId);

        emit EvidenceSubmitted(
            evidenceId,
            msg.sender,
            ipfsHash,
            evidenceType,
            fileSize
        );
    }

    /**
     * @dev Validate evidence
     * @param evidenceId ID of the evidence to validate
     * @param isValid Whether the evidence is valid
     * @param reason Reason for validation decision
     * @param level Validation level used
     */
    function validateEvidence(
        bytes32 evidenceId,
        bool isValid,
        string memory reason,
        ValidationLevel level
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyAuthorizedValidator 
        onlyExistingEvidence(evidenceId) 
        onlyPendingEvidence(evidenceId) 
    {
        require(bytes(reason).length > 0, "Reason cannot be empty");
        require(
            !evidence[evidenceId].validators[msg.sender],
            "Already validated this evidence"
        );

        Evidence storage ev = evidence[evidenceId];
        
        // Check validation timeout
        require(
            block.timestamp <= ev.timestamp + VALIDATION_TIMEOUT,
            "Validation timeout exceeded"
        );

        ev.validators[msg.sender] = true;
        ev.validationCount += 1;

        if (isValid) {
            ev.positiveValidations += 1;
        } else {
            ev.negativeValidations += 1;
        }

        // Store validation result
        validationResults[evidenceId].push(ValidationResult({
            validator: msg.sender,
            isValid: isValid,
            reason: reason,
            timestamp: block.timestamp,
            level: level
        }));

        // Update validator reputation
        if (isValid) {
            validatorReputation[msg.sender] += REPUTATION_REWARD_VALIDATION;
        }

        // Check if enough validations received
        if (ev.validationCount >= MIN_VALIDATIONS_REQUIRED) {
            _finalizeValidation(evidenceId);
        }

        emit EvidenceValidated(evidenceId, msg.sender, isValid, reason, level);
    }

    /**
     * @dev Update IPFS metadata
     * @param evidenceId ID of the evidence
     * @param verified Whether the IPFS hash is verified
     */
    function updateIPFSMetadata(bytes32 evidenceId, bool verified)
        external
        onlyOwner
        onlyExistingEvidence(evidenceId)
    {
        IPFSMetadata storage metadata = ipfsMetadata[evidenceId];
        metadata.verified = verified;

        emit IPFSMetadataUpdated(
            evidenceId,
            metadata.hash,
            metadata.size,
            metadata.mimeType
        );
    }

    /**
     * @dev Update content analysis results
     * @param evidenceId ID of the evidence
     * @param isPhishing Whether content is phishing
     * @param isMalicious Whether content is malicious
     * @param isSuspicious Whether content is suspicious
     * @param confidenceScore Confidence score (0-100)
     * @param detectedPatterns Array of detected patterns
     * @param riskFactors Array of risk factors
     */
    function updateContentAnalysis(
        bytes32 evidenceId,
        bool isPhishing,
        bool isMalicious,
        bool isSuspicious,
        uint256 confidenceScore,
        string[] memory detectedPatterns,
        string[] memory riskFactors
    ) 
        external 
        onlyOwner 
        onlyExistingEvidence(evidenceId) 
    {
        require(confidenceScore <= 100, "Confidence score cannot exceed 100");

        ContentAnalysis storage analysis = contentAnalysis[evidenceId];
        analysis.isPhishing = isPhishing;
        analysis.isMalicious = isMalicious;
        analysis.isSuspicious = isSuspicious;
        analysis.confidenceScore = confidenceScore;

        // Store patterns and risk factors
        for (uint256 i = 0; i < detectedPatterns.length; i++) {
            analysis.detectedPatterns.push(detectedPatterns[i]);
        }
        for (uint256 i = 0; i < riskFactors.length; i++) {
            analysis.riskFactors.push(riskFactors[i]);
        }

        emit ContentAnalysisUpdated(evidenceId, isPhishing, confidenceScore);
    }

    /**
     * @dev Authorize a validator
     * @param validator Address of the validator
     * @param initialReputation Initial reputation score
     */
    function authorizeValidator(address validator, uint256 initialReputation)
        external
        onlyOwner
    {
        require(validator != address(0), "Invalid validator address");
        require(!authorizedValidators[validator], "Validator already authorized");

        authorizedValidators[validator] = true;
        validatorReputation[validator] = initialReputation;
        validatorList.push(validator);

        emit ValidatorAuthorized(validator, initialReputation);
    }

    /**
     * @dev Deauthorize a validator
     * @param validator Address of the validator
     */
    function deauthorizeValidator(address validator) external onlyOwner {
        require(authorizedValidators[validator], "Validator not authorized");

        authorizedValidators[validator] = false;
        validatorReputation[validator] = 0;

        // Remove from validator list
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == validator) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }

        emit ValidatorDeauthorized(validator);
    }

    /**
     * @dev Add malicious pattern
     * @param pattern Pattern to add
     * @param isActive Whether pattern is active
     */
    function addMaliciousPattern(string memory pattern, bool isActive)
        external
        onlyOwner
    {
        require(bytes(pattern).length > 0, "Pattern cannot be empty");
        maliciousPatterns[pattern] = isActive;

        emit MaliciousPatternAdded(pattern, isActive);
    }

    /**
     * @dev Add suspicious domain
     * @param domain Domain to add
     * @param isActive Whether domain is active
     */
    function addSuspiciousDomain(string memory domain, bool isActive)
        external
        onlyOwner
    {
        require(bytes(domain).length > 0, "Domain cannot be empty");
        suspiciousDomains[domain] = isActive;

        emit SuspiciousDomainAdded(domain, isActive);
    }

    /**
     * @dev Get evidence details
     * @param evidenceId ID of the evidence
     */
    function getEvidence(bytes32 evidenceId)
        external
        view
        onlyExistingEvidence(evidenceId)
        returns (
            address submitter,
            string memory ipfsHash,
            EvidenceType evidenceType,
            EvidenceStatus status,
            ValidationLevel validationLevel,
            uint256 timestamp,
            uint256 fileSize,
            string memory mimeType,
            string memory originalUrl,
            string memory description,
            uint256 validationCount,
            uint256 positiveValidations,
            uint256 negativeValidations
        )
    {
        Evidence storage ev = evidence[evidenceId];
        return (
            ev.submitter,
            ev.ipfsHash,
            ev.evidenceType,
            ev.status,
            ev.validationLevel,
            ev.timestamp,
            ev.fileSize,
            ev.mimeType,
            ev.originalUrl,
            ev.description,
            ev.validationCount,
            ev.positiveValidations,
            ev.negativeValidations
        );
    }

    /**
     * @dev Get validation results for evidence
     * @param evidenceId ID of the evidence
     */
    function getValidationResults(bytes32 evidenceId)
        external
        view
        onlyExistingEvidence(evidenceId)
        returns (ValidationResult[] memory)
    {
        return validationResults[evidenceId];
    }

    /**
     * @dev Get IPFS metadata
     * @param evidenceId ID of the evidence
     */
    function getIPFSMetadata(bytes32 evidenceId)
        external
        view
        onlyExistingEvidence(evidenceId)
        returns (
            string memory hash,
            uint256 size,
            string memory mimeType,
            string memory encoding,
            uint256 timestamp,
            bool verified
        )
    {
        IPFSMetadata memory metadata = ipfsMetadata[evidenceId];
        return (
            metadata.hash,
            metadata.size,
            metadata.mimeType,
            metadata.encoding,
            metadata.timestamp,
            metadata.verified
        );
    }

    /**
     * @dev Get content analysis
     * @param evidenceId ID of the evidence
     */
    function getContentAnalysis(bytes32 evidenceId)
        external
        view
        onlyExistingEvidence(evidenceId)
        returns (
            bool isPhishing,
            bool isMalicious,
            bool isSuspicious,
            uint256 confidenceScore,
            string[] memory detectedPatterns,
            string[] memory riskFactors
        )
    {
        ContentAnalysis memory analysis = contentAnalysis[evidenceId];
        return (
            analysis.isPhishing,
            analysis.isMalicious,
            analysis.isSuspicious,
            analysis.confidenceScore,
            analysis.detectedPatterns,
            analysis.riskFactors
        );
    }

    /**
     * @dev Get validator reputation
     * @param validator Address of the validator
     */
    function getValidatorReputation(address validator) external view returns (uint256) {
        return validatorReputation[validator];
    }

    /**
     * @dev Check if address is authorized validator
     * @param validator Address to check
     */
    function isAuthorizedValidator(address validator) external view returns (bool) {
        return authorizedValidators[validator];
    }

    /**
     * @dev Get total number of evidence
     */
    function getEvidenceCount() external view returns (uint256) {
        return allEvidenceIds.length;
    }

    /**
     * @dev Get evidence ID by index
     * @param index Index in the array
     */
    function getEvidenceIdByIndex(uint256 index) external view returns (bytes32) {
        require(index < allEvidenceIds.length, "Index out of bounds");
        return allEvidenceIds[index];
    }

    /**
     * @dev Get validator list
     */
    function getValidatorList() external view returns (address[] memory) {
        return validatorList;
    }

    /**
     * @dev Internal function to finalize validation
     * @param evidenceId ID of the evidence
     */
    function _finalizeValidation(bytes32 evidenceId) internal {
        Evidence storage ev = evidence[evidenceId];
        EvidenceStatus oldStatus = ev.status;

        if (ev.positiveValidations > ev.negativeValidations) {
            ev.status = EvidenceStatus.Validated;
        } else {
            ev.status = EvidenceStatus.Rejected;
        }

        emit EvidenceStatusChanged(evidenceId, oldStatus, ev.status);
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
     * @dev Emergency function to update validator reputation
     * @param validator Validator address
     * @param newReputation New reputation score
     */
    function emergencyUpdateValidatorReputation(address validator, uint256 newReputation)
        external
        onlyOwner
    {
        validatorReputation[validator] = newReputation;
    }

    /**
     * @dev Emergency function to force evidence status
     * @param evidenceId ID of the evidence
     * @param newStatus New status
     */
    function emergencyUpdateEvidenceStatus(bytes32 evidenceId, EvidenceStatus newStatus)
        external
        onlyOwner
        onlyExistingEvidence(evidenceId)
    {
        Evidence storage ev = evidence[evidenceId];
        EvidenceStatus oldStatus = ev.status;
        ev.status = newStatus;

        emit EvidenceStatusChanged(evidenceId, oldStatus, newStatus);
    }
}
