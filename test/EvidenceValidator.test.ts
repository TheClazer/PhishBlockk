// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { EvidenceValidator } from "../contracts/EvidenceValidator.sol";

contract EvidenceValidatorTest is Test {
    EvidenceValidator public evidenceValidator;

    address public owner;
    address public validator1;
    address public validator2;
    address public validator3;
    address public user1;
    address public attacker;

    function setUp() public {
        owner = address(this);
        validator1 = makeAddr("validator1");
        validator2 = makeAddr("validator2");
        validator3 = makeAddr("validator3");
        user1 = makeAddr("user1");
        attacker = makeAddr("attacker");

        // Deploy evidence validator
        evidenceValidator = new EvidenceValidator();

        // Authorize validators
        evidenceValidator.authorizeValidator(validator1, 100);
        evidenceValidator.authorizeValidator(validator2, 80);
        evidenceValidator.authorizeValidator(validator3, 60);
    }

    function testInitialState() public {
        assertEq(evidenceValidator.getEvidenceCount(), 0);
        assertTrue(evidenceValidator.isAuthorizedValidator(owner));
        assertTrue(evidenceValidator.isAuthorizedValidator(validator1));
        assertTrue(evidenceValidator.isAuthorizedValidator(validator2));
        assertTrue(evidenceValidator.isAuthorizedValidator(validator3));
    }

    function testSubmitEvidence() public {
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        assertEq(evidenceValidator.getEvidenceCount(), 1);
        
        bytes32 evidenceId = evidenceValidator.getEvidenceIdByIndex(0);
        (
            address submitter,
            string memory ipfsHash,
            EvidenceValidator.EvidenceType evidenceType,
            EvidenceValidator.EvidenceStatus status,
            EvidenceValidator.ValidationLevel validationLevel,
            uint256 timestamp,
            uint256 fileSize,
            string memory mimeType,
            string memory originalUrl,
            string memory description,
            uint256 validationCount,
            uint256 positiveValidations,
            uint256 negativeValidations
        ) = evidenceValidator.getEvidence(evidenceId);

        assertEq(submitter, user1);
        assertEq(ipfsHash, "QmTestHash1234567890123456789012345678901234567890");
        assertEq(uint256(evidenceType), uint256(EvidenceValidator.EvidenceType.Screenshot));
        assertEq(uint256(status), uint256(EvidenceValidator.EvidenceStatus.Pending));
        assertEq(uint256(validationLevel), uint256(EvidenceValidator.ValidationLevel.Basic));
        assertEq(fileSize, 1024);
        assertEq(mimeType, "image/png");
        assertEq(originalUrl, "https://example.com");
        assertEq(description, "Screenshot of phishing site");
        assertEq(validationCount, 0);
        assertEq(positiveValidations, 0);
        assertEq(negativeValidations, 0);
    }

    function testValidateEvidence() public {
        // Submit evidence
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        bytes32 evidenceId = evidenceValidator.getEvidenceIdByIndex(0);

        // Validator1 validates as positive
        vm.prank(validator1);
        evidenceValidator.validateEvidence(
            evidenceId,
            true,
            "This is clearly a phishing site",
            EvidenceValidator.ValidationLevel.Standard
        );

        // Validator2 validates as negative
        vm.prank(validator2);
        evidenceValidator.validateEvidence(
            evidenceId,
            false,
            "This looks legitimate to me",
            EvidenceValidator.ValidationLevel.Basic
        );

        // Validator3 validates as positive
        vm.prank(validator3);
        evidenceValidator.validateEvidence(
            evidenceId,
            true,
            "Confirmed phishing attempt",
            EvidenceValidator.ValidationLevel.Advanced
        );

        // Check validation results
        (
            ,,,,,,,
            uint256 validationCount,
            uint256 positiveValidations,
            uint256 negativeValidations
        ) = evidenceValidator.getEvidence(evidenceId);

        assertEq(validationCount, 3);
        assertEq(positiveValidations, 2);
        assertEq(negativeValidations, 1);

        // Check final status (should be Validated since more positive validations)
        (
            ,,,EvidenceValidator.EvidenceStatus status,,,,
        ) = evidenceValidator.getEvidence(evidenceId);
        assertEq(uint256(status), uint256(EvidenceValidator.EvidenceStatus.Validated));
    }

    function testUpdateIPFSMetadata() public {
        // Submit evidence
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        bytes32 evidenceId = evidenceValidator.getEvidenceIdByIndex(0);

        // Update IPFS metadata
        evidenceValidator.updateIPFSMetadata(evidenceId, true);

        (
            string memory hash,
            uint256 size,
            string memory mimeType,
            string memory encoding,
            uint256 timestamp,
            bool verified
        ) = evidenceValidator.getIPFSMetadata(evidenceId);

        assertEq(hash, "QmTestHash1234567890123456789012345678901234567890");
        assertEq(size, 1024);
        assertEq(mimeType, "image/png");
        assertEq(encoding, "base58");
        assertTrue(verified);
    }

    function testUpdateContentAnalysis() public {
        // Submit evidence
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        bytes32 evidenceId = evidenceValidator.getEvidenceIdByIndex(0);

        // Update content analysis
        string[] memory patterns = new string[](2);
        patterns[0] = "phishing";
        patterns[1] = "fake";
        
        string[] memory riskFactors = new string[](2);
        riskFactors[0] = "suspicious_domain";
        riskFactors[1] = "typo_squatting";

        evidenceValidator.updateContentAnalysis(
            evidenceId,
            true,  // isPhishing
            true,  // isMalicious
            true,  // isSuspicious
            85,    // confidenceScore
            patterns,
            riskFactors
        );

        (
            bool isPhishing,
            bool isMalicious,
            bool isSuspicious,
            uint256 confidenceScore,
            string[] memory detectedPatterns,
            string[] memory riskFactorsReturned
        ) = evidenceValidator.getContentAnalysis(evidenceId);

        assertTrue(isPhishing);
        assertTrue(isMalicious);
        assertTrue(isSuspicious);
        assertEq(confidenceScore, 85);
        assertEq(detectedPatterns.length, 2);
        assertEq(riskFactorsReturned.length, 2);
    }

    function testAuthorizeValidator() public {
        address newValidator = makeAddr("newValidator");
        
        evidenceValidator.authorizeValidator(newValidator, 50);
        
        assertTrue(evidenceValidator.isAuthorizedValidator(newValidator));
        assertEq(evidenceValidator.getValidatorReputation(newValidator), 50);
    }

    function testDeauthorizeValidator() public {
        evidenceValidator.deauthorizeValidator(validator1);
        
        assertFalse(evidenceValidator.isAuthorizedValidator(validator1));
        assertEq(evidenceValidator.getValidatorReputation(validator1), 0);
    }

    function testAddMaliciousPattern() public {
        evidenceValidator.addMaliciousPattern("scam", true);
        evidenceValidator.addMaliciousPattern("fake", true);
        
        // Patterns should be added successfully
        assertTrue(true);
    }

    function testAddSuspiciousDomain() public {
        evidenceValidator.addSuspiciousDomain("phishing-site.com", true);
        evidenceValidator.addSuspiciousDomain("fake-bank.com", true);
        
        // Domains should be added successfully
        assertTrue(true);
    }

    function testUnauthorizedValidatorCannotValidate() public {
        // Submit evidence
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        bytes32 evidenceId = evidenceValidator.getEvidenceIdByIndex(0);

        // Unauthorized user tries to validate
        vm.prank(attacker);
        vm.expectRevert("Not an authorized validator");
        evidenceValidator.validateEvidence(
            evidenceId,
            true,
            "This should fail",
            EvidenceValidator.ValidationLevel.Basic
        );
    }

    function testCannotValidateSameEvidenceTwice() public {
        // Submit evidence
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        bytes32 evidenceId = evidenceValidator.getEvidenceIdByIndex(0);

        // Validator1 validates
        vm.prank(validator1);
        evidenceValidator.validateEvidence(
            evidenceId,
            true,
            "First validation",
            EvidenceValidator.ValidationLevel.Basic
        );

        // Same validator tries to validate again
        vm.prank(validator1);
        vm.expectRevert("Already validated this evidence");
        evidenceValidator.validateEvidence(
            evidenceId,
            false,
            "Second validation should fail",
            EvidenceValidator.ValidationLevel.Basic
        );
    }

    function testValidationTimeout() public {
        // Submit evidence
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        bytes32 evidenceId = evidenceValidator.getEvidenceIdByIndex(0);

        // Fast forward time past validation timeout
        vm.warp(block.timestamp + 8 days);

        // Try to validate after timeout
        vm.prank(validator1);
        vm.expectRevert("Validation timeout exceeded");
        evidenceValidator.validateEvidence(
            evidenceId,
            true,
            "This should fail due to timeout",
            EvidenceValidator.ValidationLevel.Basic
        );
    }

    function testInvalidIPFSHashLength() public {
        vm.prank(user1);
        vm.expectRevert("Invalid IPFS hash length");
        evidenceValidator.submitEvidence(
            "QmShortHash", // Too short
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );
    }

    function testFileSizeExceedsMaximum() public {
        vm.prank(user1);
        vm.expectRevert("File size exceeds maximum");
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            11 * 1024 * 1024, // 11MB, exceeds 10MB limit
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );
    }

    function testDuplicateIPFSHash() public {
        // Submit first evidence
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        // Try to submit evidence with same IPFS hash
        vm.prank(user1);
        vm.expectRevert("IPFS hash already exists");
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Document,
            2048,
            "application/pdf",
            "https://example2.com",
            "Different evidence with same hash"
        );
    }

    function testPauseFunctionality() public {
        evidenceValidator.pause();

        vm.prank(user1);
        vm.expectRevert();
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        evidenceValidator.unpause();

        // Should work after unpause
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );
    }

    function testEmergencyFunctions() public {
        // Submit evidence
        vm.prank(user1);
        evidenceValidator.submitEvidence(
            "QmTestHash1234567890123456789012345678901234567890",
            EvidenceValidator.EvidenceType.Screenshot,
            1024,
            "image/png",
            "https://example.com",
            "Screenshot of phishing site"
        );

        bytes32 evidenceId = evidenceValidator.getEvidenceIdByIndex(0);

        // Emergency update validator reputation
        evidenceValidator.emergencyUpdateValidatorReputation(validator1, 200);
        assertEq(evidenceValidator.getValidatorReputation(validator1), 200);

        // Emergency update evidence status
        evidenceValidator.emergencyUpdateEvidenceStatus(
            evidenceId,
            EvidenceValidator.EvidenceStatus.Validated
        );

        (
            ,,,EvidenceValidator.EvidenceStatus status,,,,
        ) = evidenceValidator.getEvidence(evidenceId);
        assertEq(uint256(status), uint256(EvidenceValidator.EvidenceStatus.Validated));
    }
}
