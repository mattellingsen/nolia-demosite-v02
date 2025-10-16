import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;

    const assessment = await prisma.assessments.findUnique({
      where: {
        id: assessmentId,
        moduleType: 'PROCUREMENT' // KEY: Ensure only procurement assessments
      },
      include: {
        fund: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      }
    });

    if (!assessment) {
      return NextResponse.json({
        error: 'Procurement assessment not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('Error fetching procurement assessment:', error);
    return NextResponse.json({
      error: 'Failed to fetch procurement assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;

    const assessment = await prisma.assessments.findUnique({
      where: {
        id: assessmentId,
        moduleType: 'PROCUREMENT' // KEY: Ensure only procurement assessments
      }
    });

    if (!assessment) {
      return NextResponse.json({
        error: 'Procurement assessment not found'
      }, { status: 404 });
    }

    await prisma.assessments.delete({
      where: { id: assessmentId }
    });

    return NextResponse.json({
      success: true,
      message: 'Procurement assessment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting procurement assessment:', error);
    return NextResponse.json({
      error: 'Failed to delete procurement assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}