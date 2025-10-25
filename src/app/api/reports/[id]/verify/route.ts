import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReportHash, verifyReportHash } from "@/lib/canonicalize";

/**
 * GET /api/reports/[id]/verify - Verify a report's hash and on-chain status
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

    // Fetch the report
    const report = await (prisma as any).report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            walletAddress: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Report not found" },
        { status: 404 }
      );
    }

    // Recompute the canonical hash
    const computedHash = generateReportHash({
      reportType: report.reportType as "phishing_url" | "scam_wallet",
      targetValue: report.targetValue,
      description: report.description,
      reporterAddress: report.reporter.walletAddress,
    });

    // Verify hash matches
    const hashMatches = computedHash === report.reportHash;

    // Prepare verification result
    const verification = {
      reportId: report.id,
      storedHash: report.reportHash,
      computedHash,
      hashMatches,
      isAnchoredOnChain: report.isAnchoredOnChain,
      onChainTxHash: report.onChainTxHash,
      reportData: {
        reportType: report.reportType,
        targetValue: report.targetValue,
        description: report.description,
        reporterAddress: report.reporter.walletAddress,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        storedHash: report.reportHash,
        computedHash,
        hashMatches,
        isAnchoredOnChain: report.isAnchoredOnChain,
        onChainTxHash: report.onChainTxHash,
        reportData: {
          reportType: report.reportType,
          targetValue: report.targetValue,
          description: report.description,
          reporterAddress: report.reporter.walletAddress,
        },
      },
    });
  } catch (error) {
    console.error("Error verifying report:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify report" },
      { status: 500 }
    );
  }
}
