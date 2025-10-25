// PhishBlock Browser Extension - Smart Contract Integration
// Handles blockchain interactions with PhishBlock contracts

class PhishBlockContractIntegration {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.contractAddresses = {
      sepolia: {
        registry: process.env.NEXT_PUBLIC_PHISHBLOCK_REGISTRY_ADDRESS || '0x...',
        reputation: process.env.NEXT_PUBLIC_REPUTATION_SYSTEM_ADDRESS || '0x...',
        validator: process.env.NEXT_PUBLIC_EVIDENCE_VALIDATOR_ADDRESS || '0x...',
        token: process.env.NEXT_PUBLIC_MOCK_TOKEN_ADDRESS || '0x...'
      }
    };
    
    this.init();
  }

  async init() {
    console.log('PhishBlock Contract Integration initialized');
    
    try {
      await this.initWeb3();
      await this.loadContracts();
    } catch (error) {
      console.error('Contract integration initialization failed:', error);
    }
  }

  async initWeb3() {
    if (typeof window.ethereum !== 'undefined') {
      this.provider = window.ethereum;
      
      try {
        // Request account access
        await this.provider.request({ method: 'eth_requestAccounts' });
        
        // Get signer
        this.signer = await this.provider.getSigner();
        
        console.log('Web3 connected successfully');
        return true;
      } catch (error) {
        console.error('User denied account access:', error);
        return false;
      }
    } else {
      console.error('MetaMask not installed');
      return false;
    }
  }

  async loadContracts() {
    try {
      // Load contract ABIs (these would be the actual ABIs from your contracts)
      const registryABI = this.getRegistryABI();
      const reputationABI = this.getReputationABI();
      const validatorABI = this.getValidatorABI();
      const tokenABI = this.getTokenABI();

      // Get current network
      const network = await this.getCurrentNetwork();
      const addresses = this.contractAddresses[network] || this.contractAddresses.sepolia;

      // Initialize contracts
      this.contracts.registry = new ethers.Contract(
        addresses.registry,
        registryABI,
        this.signer
      );

      this.contracts.reputation = new ethers.Contract(
        addresses.reputation,
        reputationABI,
        this.signer
      );

      this.contracts.validator = new ethers.Contract(
        addresses.validator,
        validatorABI,
        this.signer
      );

      this.contracts.token = new ethers.Contract(
        addresses.token,
        tokenABI,
        this.signer
      );

      console.log('Contracts loaded successfully');
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  }

  async getCurrentNetwork() {
    try {
      const network = await this.provider.getNetwork();
      return network.chainId === 11155111 ? 'sepolia' : 'sepolia'; // Default to sepolia
    } catch (error) {
      console.error('Error getting network:', error);
      return 'sepolia';
    }
  }

  // Contract Interaction Methods

  async submitReport(url, wallet, description, ipfsHash, evidenceType) {
    try {
      if (!this.contracts.registry) {
        throw new Error('Registry contract not loaded');
      }

      const tx = await this.contracts.registry.submitReport(
        url,
        wallet,
        description,
        ipfsHash,
        evidenceType
      );

      const receipt = await tx.wait();
      console.log('Report submitted:', receipt);

      return {
        success: true,
        txHash: receipt.transactionHash,
        reportId: this.extractReportId(receipt)
      };
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  }

  async voteOnReport(reportId, isUpvote) {
    try {
      if (!this.contracts.registry) {
        throw new Error('Registry contract not loaded');
      }

      const tx = await this.contracts.registry.vote(reportId, isUpvote);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error voting on report:', error);
      throw error;
    }
  }

  async raiseDispute(reportId, reason) {
    try {
      if (!this.contracts.registry) {
        throw new Error('Registry contract not loaded');
      }

      const tx = await this.contracts.registry.raiseDispute(reportId, reason);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error raising dispute:', error);
      throw error;
    }
  }

  async getUserReputation(userAddress = null) {
    try {
      if (!this.contracts.reputation) {
        throw new Error('Reputation contract not loaded');
      }

      const address = userAddress || await this.signer.getAddress();
      const reputation = await this.contracts.reputation.getUserReputation(address);

      return parseInt(reputation.toString());
    } catch (error) {
      console.error('Error getting user reputation:', error);
      return 0;
    }
  }

  async depositStake(amount, lockPeriod, stakeType) {
    try {
      if (!this.contracts.reputation) {
        throw new Error('Reputation contract not loaded');
      }

      // First approve token spending
      const approveTx = await this.contracts.token.approve(
        this.contractAddresses.sepolia.reputation,
        amount
      );
      await approveTx.wait();

      // Then deposit stake
      const tx = await this.contracts.reputation.depositStake(
        amount,
        lockPeriod,
        stakeType
      );
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error depositing stake:', error);
      throw error;
    }
  }

  async withdrawStake(stakeId) {
    try {
      if (!this.contracts.reputation) {
        throw new Error('Reputation contract not loaded');
      }

      const tx = await this.contracts.reputation.withdrawStake(stakeId);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error withdrawing stake:', error);
      throw error;
    }
  }

  async submitEvidence(ipfsHash, evidenceType, fileSize, mimeType, originalUrl, description) {
    try {
      if (!this.contracts.validator) {
        throw new Error('Validator contract not loaded');
      }

      const tx = await this.contracts.validator.submitEvidence(
        ipfsHash,
        evidenceType,
        fileSize,
        mimeType,
        originalUrl,
        description
      );
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash,
        evidenceId: this.extractEvidenceId(receipt)
      };
    } catch (error) {
      console.error('Error submitting evidence:', error);
      throw error;
    }
  }

  async validateEvidence(evidenceId, isValid, reason, level) {
    try {
      if (!this.contracts.validator) {
        throw new Error('Validator contract not loaded');
      }

      const tx = await this.contracts.validator.validateEvidence(
        evidenceId,
        isValid,
        reason,
        level
      );
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash
      };
    } catch (error) {
      console.error('Error validating evidence:', error);
      throw error;
    }
  }

  // Query Methods

  async getReport(reportId) {
    try {
      if (!this.contracts.registry) {
        throw new Error('Registry contract not loaded');
      }

      const report = await this.contracts.registry.getReport(reportId);
      return this.formatReport(report);
    } catch (error) {
      console.error('Error getting report:', error);
      return null;
    }
  }

  async getReportCount() {
    try {
      if (!this.contracts.registry) {
        throw new Error('Registry contract not loaded');
      }

      const count = await this.contracts.registry.getReportCount();
      return parseInt(count.toString());
    } catch (error) {
      console.error('Error getting report count:', error);
      return 0;
    }
  }

  async getUserVote(reportId, userAddress = null) {
    try {
      if (!this.contracts.registry) {
        throw new Error('Registry contract not loaded');
      }

      const address = userAddress || await this.signer.getAddress();
      const vote = await this.contracts.registry.getUserVote(reportId, address);
      
      return {
        hasVoted: vote.hasVoted,
        isUpvote: vote.isUpvote,
        timestamp: parseInt(vote.timestamp.toString()),
        reputationWeight: parseInt(vote.reputationWeight.toString())
      };
    } catch (error) {
      console.error('Error getting user vote:', error);
      return null;
    }
  }

  async getUserStakes(userAddress = null) {
    try {
      if (!this.contracts.reputation) {
        throw new Error('Reputation contract not loaded');
      }

      const address = userAddress || await this.signer.getAddress();
      const stakeCount = await this.contracts.reputation.getUserStakeCount(address);
      
      const stakes = [];
      for (let i = 1; i <= stakeCount; i++) {
        const stake = await this.contracts.reputation.getUserStake(address, i);
        stakes.push(this.formatStake(stake, i));
      }

      return stakes;
    } catch (error) {
      console.error('Error getting user stakes:', error);
      return [];
    }
  }

  async getEvidence(evidenceId) {
    try {
      if (!this.contracts.validator) {
        throw new Error('Validator contract not loaded');
      }

      const evidence = await this.contracts.validator.getEvidence(evidenceId);
      return this.formatEvidence(evidence);
    } catch (error) {
      console.error('Error getting evidence:', error);
      return null;
    }
  }

  // Utility Methods

  formatReport(report) {
    return {
      reportId: report.reportId,
      reporter: report.reporter,
      targetUrl: report.targetUrl,
      targetWallet: report.targetWallet,
      description: report.description,
      ipfsHash: report.ipfsHash,
      evidenceType: report.evidenceType,
      status: report.status,
      timestamp: parseInt(report.timestamp.toString()),
      upvotes: parseInt(report.upvotes.toString()),
      downvotes: parseInt(report.downvotes.toString()),
      disputeCount: parseInt(report.disputeCount.toString()),
      exists: report.exists
    };
  }

  formatStake(stake, stakeId) {
    return {
      stakeId: stakeId,
      amount: ethers.utils.formatEther(stake.amount),
      timestamp: parseInt(stake.timestamp.toString()),
      lockPeriod: parseInt(stake.lockPeriod.toString()),
      stakeType: stake.stakeType,
      active: stake.active,
      reputationMultiplier: parseInt(stake.reputationMultiplier.toString())
    };
  }

  formatEvidence(evidence) {
    return {
      evidenceId: evidence.evidenceId,
      submitter: evidence.submitter,
      ipfsHash: evidence.ipfsHash,
      evidenceType: evidence.evidenceType,
      status: evidence.status,
      validationLevel: evidence.validationLevel,
      timestamp: parseInt(evidence.timestamp.toString()),
      fileSize: parseInt(evidence.fileSize.toString()),
      mimeType: evidence.mimeType,
      originalUrl: evidence.originalUrl,
      description: evidence.description,
      validationCount: parseInt(evidence.validationCount.toString()),
      positiveValidations: parseInt(evidence.positiveValidations.toString()),
      negativeValidations: parseInt(evidence.negativeValidations.toString()),
      exists: evidence.exists
    };
  }

  extractReportId(receipt) {
    // Extract report ID from transaction receipt logs
    // This would parse the ReportSubmitted event
    return '0x' + Math.random().toString(16).substr(2, 64);
  }

  extractEvidenceId(receipt) {
    // Extract evidence ID from transaction receipt logs
    // This would parse the EvidenceSubmitted event
    return '0x' + Math.random().toString(16).substr(2, 64);
  }

  // Contract ABIs (simplified versions)
  getRegistryABI() {
    return [
      "function submitReport(string memory targetUrl, string memory targetWallet, string memory description, string memory ipfsHash, uint8 evidenceType) external",
      "function vote(bytes32 reportId, bool isUpvote) external",
      "function raiseDispute(bytes32 reportId, string memory reason) external",
      "function getReport(bytes32 reportId) external view returns (address reporter, string memory targetUrl, string memory targetWallet, string memory description, string memory ipfsHash, uint8 evidenceType, uint8 status, uint256 timestamp, uint256 upvotes, uint256 downvotes, uint256 disputeCount)",
      "function getUserVote(bytes32 reportId, address voter) external view returns (bool hasVoted, bool isUpvote, uint256 timestamp, uint256 reputationWeight)",
      "function getReportCount() external view returns (uint256)",
      "function getUserReputation(address user) external view returns (uint256)"
    ];
  }

  getReputationABI() {
    return [
      "function depositStake(uint256 amount, uint256 lockPeriod, uint8 stakeType) external",
      "function withdrawStake(uint256 stakeId) external",
      "function getUserReputation(address user) external view returns (uint256)",
      "function getUserStake(address user, uint256 stakeId) external view returns (uint256 amount, uint256 timestamp, uint256 lockPeriod, uint8 stakeType, bool active, uint256 reputationMultiplier)",
      "function getUserStakeCount(address user) external view returns (uint256)",
      "function getPendingRewards(address user) external view returns (uint256)"
    ];
  }

  getValidatorABI() {
    return [
      "function submitEvidence(string memory ipfsHash, uint8 evidenceType, uint256 fileSize, string memory mimeType, string memory originalUrl, string memory description) external",
      "function validateEvidence(bytes32 evidenceId, bool isValid, string memory reason, uint8 level) external",
      "function getEvidence(bytes32 evidenceId) external view returns (address submitter, string memory ipfsHash, uint8 evidenceType, uint8 status, uint8 validationLevel, uint256 timestamp, uint256 fileSize, string memory mimeType, string memory originalUrl, string memory description, uint256 validationCount, uint256 positiveValidations, uint256 negativeValidations)",
      "function getEvidenceCount() external view returns (uint256)"
    ];
  }

  getTokenABI() {
    return [
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function balanceOf(address account) external view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)"
    ];
  }
}

// Export for use in other scripts
window.PhishBlockContractIntegration = PhishBlockContractIntegration;
