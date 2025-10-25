import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET handler - Read records with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const reportType = searchParams.get('reportType');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;
    
    // Build where conditions for Prisma
    const where: any = {};
    if (reportType) {
      where.reportType = reportType;
    }
    if (search) {
      where.OR = [
        { targetValue: { contains: search } },
        { description: { contains: search } }
      ];
    }

    // Fetch reports with filters using Prisma
    const [reportsList, total] = await Promise.all([
      (prisma as any).report.findMany({
        where,
        include: {
          reporter: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      (prisma as any).report.count({ where })
    ]);

    // Transform reports to match expected interface
    const transformedReports = reportsList.map((report: any) => ({
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
    }));

    return NextResponse.json({
      success: true,
      data: {
        reports: transformedReports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

// POST handler - Create record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reportType,
      targetValue,
      description,
      reporterAddress,
      anchorOnChain,
      onChainTxHash,
      reportHash,
    } = body;
    
    // Validate required fields
    if (!reportType || !targetValue || !description || !reporterAddress) {
      return NextResponse.json({ 
        success: false,
        error: "reportType, targetValue, description, and reporterAddress are required" 
      }, { status: 400 });
    }

    // Validate reportType
    if (!['phishing_url', 'scam_wallet'].includes(reportType)) {
      return NextResponse.json({ 
        success: false,
        error: "reportType must be either 'phishing_url' or 'scam_wallet'" 
      }, { status: 400 });
    }

    // Find or create user
    let user = await (prisma as any).user.findUnique({
      where: { walletAddress: reporterAddress }
    });

    if (!user) {
      user = await (prisma as any).user.create({
        data: { walletAddress: reporterAddress }
      });
    }
    
    // Create report using Prisma
    const newRecord = await (prisma as any).report.create({
      data: {
        reportType,
        targetValue,
        description,
        reportHash: reportHash || null,
        isAnchoredOnChain: anchorOnChain !== undefined ? anchorOnChain : false,
        onChainTxHash: onChainTxHash || null,
        reporterId: user.id,
      },
      include: {
        reporter: true
      }
    });
    
    return NextResponse.json({
      success: true,
      data: newRecord
    }, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
