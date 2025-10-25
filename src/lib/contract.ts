import { ethers, BrowserProvider, Contract } from "ethers";

const REPORT_REGISTRY_ABI = [
  "function registerReport(bytes32 reportHash) external",
  "function vote(bytes32 reportHash, bool isUpvote) external",
  "function getReport(bytes32 reportHash) external view returns (address reporter, uint256 timestamp, int256 voteScore, bool exists)",
  "function getUserVote(bytes32 reportHash, address voter) external view returns (bool hasVoted, bool isUpvote)",
  "function getReportCount() external view returns (uint256)",
  "function getReportHashByIndex(uint256 index) external view returns (bytes32)",
  "event ReportRegistered(bytes32 indexed reportHash, address indexed reporter, uint256 timestamp)",
  "event VoteCast(bytes32 indexed reportHash, address indexed voter, bool isUpvote, int256 newScore)",
  "event VoteChanged(bytes32 indexed reportHash, address indexed voter, bool isUpvote, int256 newScore)"
];

/**
 * Get the contract instance
 */
export function getContract(signerOrProvider: BrowserProvider | ethers.Signer): Contract {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new Error("Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env");
  }

  return new ethers.Contract(contractAddress, REPORT_REGISTRY_ABI, signerOrProvider);
}

/**
 * Register a report on-chain
 */
export async function registerReportOnChain(
  provider: BrowserProvider,
  reportHash: string
): Promise<string> {
  const signer = await provider.getSigner();
  const contract = getContract(signer);

  const tx = await contract.registerReport(reportHash);
  const receipt = await tx.wait();

  return receipt.hash;
}

/**
 * Cast a vote on a report
 */
export async function voteOnChain(
  provider: BrowserProvider,
  reportHash: string,
  isUpvote: boolean
): Promise<string> {
  const signer = await provider.getSigner();
  const contract = getContract(signer);

  const tx = await contract.vote(reportHash, isUpvote);
  const receipt = await tx.wait();

  return receipt.hash;
}

/**
 * Get report data from chain
 */
export async function getReportFromChain(
  provider: BrowserProvider,
  reportHash: string
): Promise<{
  reporter: string;
  timestamp: bigint;
  voteScore: bigint;
  exists: boolean;
}> {
  const contract = getContract(provider);
  const [reporter, timestamp, voteScore, exists] = await contract.getReport(reportHash);

  return {
    reporter,
    timestamp,
    voteScore,
    exists,
  };
}

/**
 * Get user's vote on a report
 */
export async function getUserVoteFromChain(
  provider: BrowserProvider,
  reportHash: string,
  userAddress: string
): Promise<{
  hasVoted: boolean;
  isUpvote: boolean;
}> {
  const contract = getContract(provider);
  const [hasVoted, isUpvote] = await contract.getUserVote(reportHash, userAddress);

  return { hasVoted, isUpvote };
}

/**
 * Get total report count from chain
 */
export async function getReportCountFromChain(provider: BrowserProvider): Promise<number> {
  const contract = getContract(provider);
  const count = await contract.getReportCount();
  return Number(count);
}
