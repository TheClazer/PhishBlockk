import { ethers } from "ethers";

// Contract ABI - This would be generated from the compiled contract
const STAKE_REGISTRY_ABI = [
  // Events
  "event ReportSubmitted(uint256 indexed reportId, address indexed reporter, uint256 stakeAmount)",
  "event VoteCast(uint256 indexed reportId, address indexed validator, uint8 vote, uint256 stakeAmount)",
  "event ReportValidated(uint256 indexed reportId, address indexed reporter, uint256 reward)",
  "event ReportRejected(uint256 indexed reportId, address indexed reporter, uint256 burnedStake)",
  "event ValidatorRegistered(address indexed validator, uint256 validatorId)",
  
  // Functions
  "function registerValidator() external",
  "function submitReportWithStake(string memory reportType, string memory targetValue, string memory description, string memory reportHash) external payable",
  "function voteOnReport(uint256 reportId, bool isValid) external payable",
  "function getReport(uint256 reportId) external view returns (uint256, string memory, string memory, string memory, string memory, address, uint256, uint256, uint256, uint8, uint256, uint256, address[] memory)",
  "function getValidator(address validatorAddress) external view returns (uint256, address, uint256, uint256, uint256, bool, uint256)",
  "function getUserReports(address user) external view returns (uint256[])",
  "function getValidatorReports(address validator) external view returns (uint256[])",
  "function getTotalReports() external view returns (uint256)",
  "function getTotalValidators() external view returns (uint256)",
  
  // Constants
  "function REPORT_STAKE() external view returns (uint256)",
  "function VOTING_STAKE() external view returns (uint256)",
  "function VALIDATOR_REWARD() external view returns (uint256)",
  "function REPORTER_REWARD() external view returns (uint256)",
  "function MIN_VALIDATORS() external view returns (uint256)",
  "function MAX_VALIDATORS() external view returns (uint256)",
  "function VOTING_PERIOD() external view returns (uint256)"
];

export interface ReportData {
  id: number;
  reportType: string;
  targetValue: string;
  description: string;
  reportHash: string;
  reporter: string;
  stakeAmount: string;
  timestamp: number;
  votingDeadline: number;
  status: number; // 0: Pending, 1: Validated, 2: Rejected, 3: Expired
  validVotes: number;
  invalidVotes: number;
  validators: string[];
}

export interface ValidatorData {
  id: number;
  validatorAddress: string;
  reputation: number;
  totalValidations: number;
  correctValidations: number;
  isActive: boolean;
  registrationTime: number;
}

export interface ContractConstants {
  reportStake: string;
  votingStake: string;
  validatorReward: string;
  reporterReward: string;
  minValidators: number;
  maxValidators: number;
  votingPeriod: number;
}

export class StakeRegistryContract {
  private contract: ethers.Contract;
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner | null = null;

  constructor(contractAddress: string, provider: ethers.BrowserProvider) {
    this.provider = provider;
    this.contract = new ethers.Contract(contractAddress, STAKE_REGISTRY_ABI, provider);
  }

  async connectSigner(): Promise<void> {
    this.signer = await this.provider.getSigner();
    this.contract = this.contract.connect(this.signer);
  }

  async getConstants(): Promise<ContractConstants> {
    const [
      reportStake,
      votingStake,
      validatorReward,
      reporterReward,
      minValidators,
      maxValidators,
      votingPeriod
    ] = await Promise.all([
      this.contract.REPORT_STAKE(),
      this.contract.VOTING_STAKE(),
      this.contract.VALIDATOR_REWARD(),
      this.contract.REPORTER_REWARD(),
      this.contract.MIN_VALIDATORS(),
      this.contract.MAX_VALIDATORS(),
      this.contract.VOTING_PERIOD()
    ]);

    return {
      reportStake: ethers.formatEther(reportStake),
      votingStake: ethers.formatEther(votingStake),
      validatorReward: ethers.formatEther(validatorReward),
      reporterReward: ethers.formatEther(reporterReward),
      minValidators: Number(minValidators),
      maxValidators: Number(maxValidators),
      votingPeriod: Number(votingPeriod)
    };
  }

  async registerValidator(): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error("Signer not connected");
    }
    return await this.contract.registerValidator();
  }

  async submitReportWithStake(
    reportType: string,
    targetValue: string,
    description: string,
    reportHash: string,
    stakeAmount: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error("Signer not connected");
    }
    
    const stakeWei = ethers.parseEther(stakeAmount);
    return await this.contract.submitReportWithStake(
      reportType,
      targetValue,
      description,
      reportHash,
      { value: stakeWei }
    );
  }

  async voteOnReport(
    reportId: number,
    isValid: boolean,
    stakeAmount: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.signer) {
      throw new Error("Signer not connected");
    }
    
    const stakeWei = ethers.parseEther(stakeAmount);
    return await this.contract.voteOnReport(reportId, isValid, { value: stakeWei });
  }

  async getReport(reportId: number): Promise<ReportData> {
    const result = await this.contract.getReport(reportId);
    
    return {
      id: Number(result[0]),
      reportType: result[1],
      targetValue: result[2],
      description: result[3],
      reportHash: result[4],
      reporter: result[5],
      stakeAmount: ethers.formatEther(result[6]),
      timestamp: Number(result[7]),
      votingDeadline: Number(result[8]),
      status: Number(result[9]),
      validVotes: Number(result[10]),
      invalidVotes: Number(result[11]),
      validators: result[12]
    };
  }

  async getValidator(validatorAddress: string): Promise<ValidatorData> {
    const result = await this.contract.getValidator(validatorAddress);
    
    return {
      id: Number(result[0]),
      validatorAddress: result[1],
      reputation: Number(result[2]),
      totalValidations: Number(result[3]),
      correctValidations: Number(result[4]),
      isActive: result[5],
      registrationTime: Number(result[6])
    };
  }

  async getUserReports(userAddress: string): Promise<number[]> {
    const reports = await this.contract.getUserReports(userAddress);
    return reports.map((id: any) => Number(id));
  }

  async getValidatorReports(validatorAddress: string): Promise<number[]> {
    const reports = await this.contract.getValidatorReports(validatorAddress);
    return reports.map((id: any) => Number(id));
  }

  async getTotalReports(): Promise<number> {
    const total = await this.contract.getTotalReports();
    return Number(total);
  }

  async getTotalValidators(): Promise<number> {
    const total = await this.contract.getTotalValidators();
    return Number(total);
  }

  // Event listeners
  onReportSubmitted(callback: (reportId: number, reporter: string, stakeAmount: string) => void) {
    this.contract.on("ReportSubmitted", (reportId, reporter, stakeAmount) => {
      callback(Number(reportId), reporter, ethers.formatEther(stakeAmount));
    });
  }

  onVoteCast(callback: (reportId: number, validator: string, vote: number, stakeAmount: string) => void) {
    this.contract.on("VoteCast", (reportId, validator, vote, stakeAmount) => {
      callback(Number(reportId), validator, Number(vote), ethers.formatEther(stakeAmount));
    });
  }

  onReportValidated(callback: (reportId: number, reporter: string, reward: string) => void) {
    this.contract.on("ReportValidated", (reportId, reporter, reward) => {
      callback(Number(reportId), reporter, ethers.formatEther(reward));
    });
  }

  onReportRejected(callback: (reportId: number, reporter: string, burnedStake: string) => void) {
    this.contract.on("ReportRejected", (reportId, reporter, burnedStake) => {
      callback(Number(reportId), reporter, ethers.formatEther(burnedStake));
    });
  }

  onValidatorRegistered(callback: (validator: string, validatorId: number) => void) {
    this.contract.on("ValidatorRegistered", (validator, validatorId) => {
      callback(validator, Number(validatorId));
    });
  }

  // Remove all listeners
  removeAllListeners() {
    this.contract.removeAllListeners();
  }
}

// Utility functions
export function getStatusText(status: number): string {
  switch (status) {
    case 0: return "Pending";
    case 1: return "Validated";
    case 2: return "Rejected";
    case 3: return "Expired";
    default: return "Unknown";
  }
}

export function getStatusColor(status: number): string {
  switch (status) {
    case 0: return "yellow";
    case 1: return "green";
    case 2: return "red";
    case 3: return "gray";
    default: return "gray";
  }
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function isVotingOpen(votingDeadline: number): boolean {
  return Date.now() / 1000 < votingDeadline;
}

export function getTimeRemaining(votingDeadline: number): string {
  const now = Date.now() / 1000;
  const remaining = votingDeadline - now;
  
  if (remaining <= 0) return "Closed";
  
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

