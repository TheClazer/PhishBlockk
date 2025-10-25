import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reports/[id] - Get a single report by ID
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
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    const report = await (prisma as any).report.findUnique({
      where: { id: reportId },
      include: {
        reporter: true
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Transform to match expected interface
    const transformedReport = {
      id: report.id,
      reportType: report.reportType,
      targetValue: report.targetValue,
      description: report.description,
      reportHash: report.reportHash,
      isAnchoredOnChain: report.isAnchoredOnChain,
      onChainTxHash: report.onChainTxHash,
      createdAt: report.createdAt,
      reporter: {
        walletAddress: report.reporter.walletAddress
      }
    };

    return NextResponse.json({
      success: true,
      data: transformedReport
    });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/reports/[id] - Update a report
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    const updates = await request.json();

    // Check if report exists
    const existingReport = await (prisma as any).report.findUnique({
      where: { id: reportId }
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const updatedReport = await (prisma as any).report.update({
      where: { id: reportId },
      data: updates,
      include: {
        reporter: true
      }
    });

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/[id] - Delete a report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reportId = parseInt(id);

    if (isNaN(reportId)) {
      return NextResponse.json(
        { error: 'Valid ID is required' },
        { status: 400 }
      );
    }

    await (prisma as any).report.delete({
      where: { id: reportId }
    });

    return NextResponse.json({
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}
