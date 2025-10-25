import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ethers } from 'ethers';
import { connectWallet } from '@/lib/wallet';

// Assuming we have a server-side signer for minting
const NFT_SIGNER_PRIVATE_KEY = process.env.NFT_SIGNER_PRIVATE_KEY;
const REPUTATION_NFT_ADDRESS = process.env.REPUTATION_NFT_ADDRESS;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, level, metadataURI } = body;

    if (!userId || !level || !metadataURI) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const dbUser = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create DB entry first
    const badge = await (prisma as any).badge.create({
      data: {
        ownerId: parseInt(userId),
        level: parseInt(level),
        tier: getTierName(parseInt(level)),
        metadataURI,
      },
    });

    // Mint on-chain if signer is available
    if (NFT_SIGNER_PRIVATE_KEY && REPUTATION_NFT_ADDRESS) {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const signer = new ethers.Wallet(NFT_SIGNER_PRIVATE_KEY, provider);

      const nftContract = new ethers.Contract(
        REPUTATION_NFT_ADDRESS,
        ['function mintBadge(address to, uint8 level, string memory uri)'],
        signer
      );

      const tx = await nftContract.mintBadge(dbUser.walletAddress, parseInt(level), metadataURI);
      await tx.wait();

      // Update DB with tokenId (assuming we can get it from event or contract)
      // For simplicity, assume tokenId is badge.id for now
      await (prisma as any).badge.update({
        where: { id: badge.id },
        data: {
          tokenId: BigInt(badge.id), // Placeholder
          mintedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ badge }, { status: 201 });
  } catch (error) {
    console.error('Error minting badge:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getTierName(level: number): string {
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  return tiers[level] || 'Bronze';
}
