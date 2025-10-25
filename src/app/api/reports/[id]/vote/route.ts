import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/reports/[id]/vote - Cast a vote on a report
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return NextResponse.json(
        { success: false, error: "Invalid report ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { voterAddress, isValid } = body;

    if (!voterAddress || typeof isValid !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "voterAddress and isValid are required" },
        { status: 400 }
      );
    }

    // Check if report exists
    const report = await (prisma as any).report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 }
      );
    }

    // Check if user already voted
    const existingVote = await (prisma as any).vote.findUnique({
      where: {
        reportId_voterAddress: {
          reportId: reportId,
          voterAddress: voterAddress
        }
      }
    });

    if (existingVote) {
      // Update existing vote
      await (prisma as any).vote.update({
        where: {
          reportId_voterAddress: {
            reportId: reportId,
            voterAddress: voterAddress
          }
        },
        data: { isValid }
      });
    } else {
      // Create new vote
      await (prisma as any).vote.create({
        data: {
          reportId: reportId,
          voterAddress: voterAddress,
          isValid: isValid
        }
      });
    }

    // Get updated vote counts using raw SQL for now
    const validVotesResult = await (prisma as any).$queryRaw`
      SELECT COUNT(*) as count FROM votes WHERE reportId = ${reportId} AND isValid = true
    `;
    const invalidVotesResult = await (prisma as any).$queryRaw`
      SELECT COUNT(*) as count FROM votes WHERE reportId = ${reportId} AND isValid = false
    `;

    const validVotes = Number(validVotesResult[0]?.count) || 0;
    const invalidVotes = Number(invalidVotesResult[0]?.count) || 0;

    return NextResponse.json({
      success: true,
      data: {
        validVotes,
        invalidVotes,
        totalVotes: validVotes + invalidVotes
      }
    });

  } catch (error) {
    console.error("Error voting on report:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record vote" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/[id]/vote - Get vote counts for a report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return NextResponse.json(
        { success: false, error: "Invalid report ID" },
        { status: 400 }
      );
    }

    // Check if report exists
    const report = await (prisma as any).report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 }
      );
    }

    // Get vote counts using raw SQL
    const validVotesResult = await (prisma as any).$queryRaw`
      SELECT COUNT(*) as count FROM votes WHERE reportId = ${reportId} AND isValid = true
    `;
    const invalidVotesResult = await (prisma as any).$queryRaw`
      SELECT COUNT(*) as count FROM votes WHERE reportId = ${reportId} AND isValid = false
    `;

    const validVotes = Number(validVotesResult[0]?.count) || 0;
    const invalidVotes = Number(invalidVotesResult[0]?.count) || 0;

    return NextResponse.json({
      success: true,
      data: {
        validVotes,
        invalidVotes,
        totalVotes: validVotes + invalidVotes
      }
    });

  } catch (error) {
    console.error("Error fetching vote counts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vote counts" },
      { status: 500 }
    );
  }
}
