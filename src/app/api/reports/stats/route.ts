import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/reports/stats - Get statistics about reports
 */
export async function GET() {
  try {
    const [
      totalReports,
      anchoredReports,
      phishingReports,
      scamWalletReports,
      totalUsers,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { isAnchoredOnChain: true } }),
      prisma.report.count({ where: { reportType: 'phishing_url' } }),
      prisma.report.count({ where: { reportType: 'scam_wallet' } }),
      prisma.user.count(),
    ]);

    const anchoredPercentage = totalReports > 0 
      ? ((anchoredReports / totalReports) * 100).toFixed(1)
      : "0";

    return NextResponse.json({
      success: true,
      data: {
        totalReports,
        anchoredReports,
        phishingReports,
        scamWalletReports,
        totalUsers,
        anchoredPercentage,
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}