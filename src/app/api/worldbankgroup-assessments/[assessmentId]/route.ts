import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch a single assessment by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { assessmentId: string } }
) {
  try {
    const { assessmentId } = params;

    console.log(`[WorldBankGroup Assessment] Fetching assessment: ${assessmentId}`);

    const assessment = await prisma.assessments.findUnique({
      where: {
        id: assessmentId,
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
      }
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Found assessment: ${assessmentId}`);

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        organizationName: assessment.organizationName,
        projectName: assessment.projectName || 'Unknown Project',
        status: assessment.status,
        overallScore: assessment.overallScore ? parseFloat(assessment.overallScore.toString()) : 0,
        createdAt: assessment.createdAt.toISOString(),
        assessmentData: assessment.assessmentData,
        fundId: assessment.fundId,
      }
    });

  } catch (error) {
    console.error('[WorldBankGroup Assessment] Error fetching assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch assessment',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete an assessment by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: { assessmentId: string } }
) {
  try {
    const { assessmentId } = params;

    console.log(`[WorldBankGroup Assessment] Deleting assessment: ${assessmentId}`);

    // Check if assessment exists
    const assessment = await prisma.assessments.findUnique({
      where: {
        id: assessmentId,
        moduleType: 'WORLDBANKGROUP'
      }
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Delete the assessment
    await prisma.assessments.delete({
      where: {
        id: assessmentId
      }
    });

    console.log(`✅ Assessment deleted: ${assessmentId}`);

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully'
    });

  } catch (error) {
    console.error('[WorldBankGroup Assessment] Error deleting assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete assessment',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
