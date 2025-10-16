import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  try {
    const { assessmentId } = await params;

    const assessment = await prisma.assessments.findUnique({
      where: { id: assessmentId },
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
        error: 'Assessment not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json({
      error: 'Failed to fetch assessment',
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
      where: { id: assessmentId }
    });

    if (!assessment) {
      return NextResponse.json({
        error: 'Assessment not found'
      }, { status: 404 });
    }

    await prisma.assessments.delete({
      where: { id: assessmentId }
    });

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting assessment:', error);
    return NextResponse.json({
      error: 'Failed to delete assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}