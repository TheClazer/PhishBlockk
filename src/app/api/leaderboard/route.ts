import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'all'; // 30d, 90d, all

    let dateFilter = {};
    if (timeRange === '30d') {
      dateFilter = { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    } else if (timeRange === '90d') {
      dateFilter = { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } };
    }

    // Top Reporters: by validated reports
    const topReporters = await (prisma as any).report.findMany({
      where: {
        ...dateFilter,
        // Assuming validated reports have isAnchoredOnChain: true or some status
      },
      include: { reporter: true },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by reporter
    const reporterStats = topReporters.reduce((acc: any, report: any) => {
      const id = report.reporter.id;
      if (!acc[id]) {
        acc[id] = { user: report.reporter, count: 0 };
      }
      acc[id].count += 1;
      return acc;
    }, {});

    const topReportersList = Object.values(reporterStats).sort((a: any, b: any) => b.count - a.count);

    // Top Validators: by votes cast (assuming accuracy from existing system)
    const topValidators = await (prisma as any).vote.findMany({
      where: dateFilter,
      include: { report: true },
    });

    // Aggregate by voter
    const validatorStats = topValidators.reduce((acc: any, vote: any) => {
      const address = vote.voterAddress;
      if (!acc[address]) {
        acc[address] = { address, votes: 0 };
      }
      acc[address].votes += 1;
      return acc;
    }, {});

    const topValidatorsList = Object.values(validatorStats).sort((a: any, b: any) => b.votes - a.votes);

    return NextResponse.json({
      topReporters: topReportersList,
      topValidators: topValidatorsList,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
