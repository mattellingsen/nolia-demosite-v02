import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List all assessments (both IN_PROGRESS and COMPLETED)
export async function GET(req: NextRequest) {
  try {
    console.log('[WorldBankGroup Assessments] Fetching all assessments');

    const assessments = await prisma.assessments.findMany({
      where: {
        moduleType: 'WORLDBANKGROUP'
      },
      select: {
        id: true,
        organizationName: true,
        projectName: true,
        status: true,
        overallScore: true,
        createdAt: true,
        assessmentData: true,
        fundId: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${assessments.length} assessments`);

    return NextResponse.json({
      success: true,
      assessments: assessments.map(assessment => ({
        id: assessment.id,
        organizationName: assessment.organizationName,
        projectName: assessment.projectName || 'Unknown Project',
        status: assessment.status,
        overallScore: assessment.overallScore ? parseFloat(assessment.overallScore.toString()) : 0,
        createdAt: assessment.createdAt.toISOString(),
        filename: (assessment.assessmentData as any)?.evaluationReportFilename || 'Unknown',
        fileSize: (assessment.assessmentData as any)?.fileSize || 0,
        isProcessing: assessment.status === 'IN_PROGRESS',
      }))
    });

  } catch (error) {
    console.error('[WorldBankGroup Assessments] Error fetching assessments:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch assessments',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
