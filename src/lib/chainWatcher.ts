import { ethers } from 'ethers';
import { prisma } from './prisma';

// Contract addresses and ABIs (placeholder)
const REPUTATION_NFT_ADDRESS = process.env.REPUTATION_NFT_ADDRESS;
const PHISHDAO_ADDRESS = process.env.PHISHDAO_ADDRESS;
const RPC_URL = process.env.RPC_URL;

const NFT_ABI = [
  'event BadgeMinted(address indexed owner, uint256 indexed tokenId, uint8 level)',
  'event BadgeUpdated(uint256 indexed tokenId, uint8 newLevel)',
];

const DAO_ABI = [
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description)',
  'event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight)',
  'event ProposalExecuted(uint256 indexed proposalId)',
];

export class ChainWatcher {
  private provider: ethers.JsonRpcProvider;
  private nftContract: ethers.Contract | null = null;
  private daoContract: ethers.Contract | null = null;

  constructor() {
    if (!RPC_URL || !REPUTATION_NFT_ADDRESS || !PHISHDAO_ADDRESS) {
      throw new Error('Missing required environment variables for chain watcher');
    }

    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.nftContract = new ethers.Contract(REPUTATION_NFT_ADDRESS, NFT_ABI, this.provider);
    this.daoContract = new ethers.Contract(PHISHDAO_ADDRESS, DAO_ABI, this.provider);
  }

  async startWatching() {
    console.log('Starting chain watcher...');

    // Watch NFT events
    if (this.nftContract) {
      this.nftContract.on('BadgeMinted', this.handleBadgeMinted.bind(this));
      this.nftContract.on('BadgeUpdated', this.handleBadgeUpdated.bind(this));
    }

    // Watch DAO events
    if (this.daoContract) {
      this.daoContract.on('ProposalCreated', this.handleProposalCreated.bind(this));
      this.daoContract.on('VoteCast', this.handleVoteCast.bind(this));
      this.daoContract.on('ProposalExecuted', this.handleProposalExecuted.bind(this));
    }

    console.log('Chain watcher started.');
  }

  async handleBadgeMinted(owner: string, tokenId: bigint, level: number) {
    console.log(`Badge minted: owner=${owner}, tokenId=${tokenId}, level=${level}`);

    // Find user by wallet address
    const user = await (prisma as any).user.findUnique({ where: { walletAddress: owner } });
    if (user) {
      // Update badge in DB
      await (prisma as any).badge.updateMany({
        where: { ownerId: user.id, tokenId: null },
        data: { tokenId: BigInt(tokenId.toString()), mintedAt: new Date() },
      });
    }
  }

  async handleBadgeUpdated(tokenId: bigint, newLevel: number) {
    console.log(`Badge updated: tokenId=${tokenId}, newLevel=${newLevel}`);

    // Update badge level in DB
    await (prisma as any).badge.updateMany({
      where: { tokenId: BigInt(tokenId.toString()) },
      data: { level: newLevel, updatedAt: new Date() },
    });
  }

  async handleProposalCreated(proposalId: bigint, proposer: string, description: string) {
    console.log(`Proposal created: proposalId=${proposalId}, proposer=${proposer}`);

    // Find user by wallet address
    const user = await (prisma as any).user.findUnique({ where: { walletAddress: proposer } });
    if (user) {
      // Create proposal in DB
      await (prisma as any).proposal.create({
        data: {
          onchainId: BigInt(proposalId.toString()),
          proposerId: user.id,
          title: description, // Assuming description contains title
          description,
          status: 'Active',
          startTime: new Date(),
        },
      });
    }
  }

  async handleVoteCast(voter: string, proposalId: bigint, support: number, weight: bigint) {
    console.log(`Vote cast: voter=${voter}, proposalId=${proposalId}, support=${support}`);

    // Find user and proposal
    const user = await (prisma as any).user.findUnique({ where: { walletAddress: voter } });
    const proposal = await (prisma as any).proposal.findUnique({ where: { onchainId: BigInt(proposalId.toString()) } });

    if (user && proposal) {
      const choice = support === 1 ? 'For' : support === 0 ? 'Against' : 'Abstain';

      await (prisma as any).proposalVote.create({
        data: {
          proposalId: proposal.id,
          voterId: user.id,
          choice,
          weight: parseFloat(weight.toString()),
        },
      });
    }
  }

  async handleProposalExecuted(proposalId: bigint) {
    console.log(`Proposal executed: proposalId=${proposalId}`);

    // Update proposal status
    await (prisma as any).proposal.updateMany({
      where: { onchainId: BigInt(proposalId.toString()) },
      data: { status: 'Executed', endTime: new Date() },
    });

    // TODO: Update report status based on proposal outcome
  }

  async stopWatching() {
    if (this.nftContract) {
      this.nftContract.removeAllListeners();
    }
    if (this.daoContract) {
      this.daoContract.removeAllListeners();
    }
    console.log('Chain watcher stopped.');
  }
}

// Function to start the watcher (can be called from a server route or worker)
export async function startChainWatcher() {
  const watcher = new ChainWatcher();
  await watcher.startWatching();
  return watcher;
}
