import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/dao/proposals
export async function GET(request: NextRequest) {
  try {
    const proposals = await (prisma as any).proposal.findMany({
      include: {
        report: true,
        proposer: true,
        proposalVotes: { include: { voter: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/dao/proposals
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, title, description } = body;

    if (!reportId || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if report exists
    const report = await (prisma as any).report.findUnique({ where: { id: parseInt(reportId) } });
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Create proposal in DB
    const proposal = await (prisma as any).proposal.create({
      data: {
        reportId: parseInt(reportId),
        proposerId: user.id, // Assuming user.id is available
        title,
        description,
        status: 'Pending',
      },
      include: { report: true, proposer: true },
    });

    // TODO: Create on-chain proposal if needed

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
