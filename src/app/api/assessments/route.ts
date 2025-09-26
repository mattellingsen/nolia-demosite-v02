import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { AssessmentType, AssessmentStatus } from '@prisma/client';

interface CreateAssessmentRequest {
  fundId: string;
  organizationName: string;
  projectName?: string;
  assessmentType?: AssessmentType;
  overallScore?: number;
  scoringResults: any;
  assessmentData: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAssessmentRequest = await request.json();
    const {
      fundId,
      organizationName,
      projectName,
      assessmentType = AssessmentType.AI_POWERED,
      overallScore,
      scoringResults,
      assessmentData
    } = body;

    if (!fundId || !organizationName || !scoringResults || !assessmentData) {
      return NextResponse.json({
        error: 'Missing required fields: fundId, organizationName, scoringResults, assessmentData'
      }, { status: 400 });
    }

    // Verify fund exists
    const fund = await prisma.fund.findUnique({
      where: { id: fundId }
    });

    if (!fund) {
      return NextResponse.json({
        error: 'Fund not found'
      }, { status: 404 });
    }

    // Create assessment record
    const assessment = await prisma.assessment.create({
      data: {
        fundId,
        organizationName,
        projectName,
        assessmentType,
        status: AssessmentStatus.COMPLETED,
        overallScore,
        scoringResults,
        assessmentData,
      },
      include: {
        fund: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      assessment,
      message: 'Assessment saved successfully'
    });

  } catch (error) {
    console.error('Error saving assessment:', error);
    return NextResponse.json({
      error: 'Failed to save assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where = fundId ? { fundId } : {};

    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        fund: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await prisma.assessment.count({ where });

    return NextResponse.json({
      success: true,
      assessments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json({
      error: 'Failed to fetch assessments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}