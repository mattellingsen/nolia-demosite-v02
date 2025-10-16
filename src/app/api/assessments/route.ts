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
  console.log('📨 POST /api/assessments: Received save request');
  try {
    const body: CreateAssessmentRequest = await request.json();
    console.log('📋 Assessment data received:', {
      fundId: body.fundId,
      organizationName: body.organizationName,
      projectName: body.projectName,
      assessmentType: body.assessmentType,
      hasScoring: !!body.scoringResults,
      hasData: !!body.assessmentData
    });
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
    const fund = await prisma.funds.findUnique({
      where: { id: fundId }
    });

    if (!fund) {
      return NextResponse.json({
        error: 'Fund not found'
      }, { status: 404 });
    }

    // Create assessment record
    console.log('💾 Creating assessment in database...');
    const assessment = await prisma.assessments.create({
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

    console.log('✅ Assessment created successfully:', assessment.id, assessment.organizationName);

    return NextResponse.json({
      success: true,
      assessment,
      message: 'Assessment saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving assessment:', error);
    return NextResponse.json({
      error: 'Failed to save assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('📨 GET /api/assessments: Received fetch request');

  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 Query parameters:', { fundId, limit, offset });

    // Build where clause
    const where = fundId ? { fundId } : {};

    const assessments = await prisma.assessments.findMany({
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

    console.log(`✅ Found ${assessments.length} assessments`);

    // Convert Decimal fields to numbers for JSON serialization
    const serializedAssessments = assessments.map(assessment => ({
      ...assessment,
      overallScore: assessment.overallScore ? Number(assessment.overallScore) : null
    }));

    // Get total count for pagination
    const total = await prisma.assessments.count({ where });

    console.log(`📊 Total assessments in database: ${total}`);

    // Log first assessment for debugging
    if (serializedAssessments.length > 0) {
      console.log('📝 First assessment:', {
        id: serializedAssessments[0].id,
        organizationName: serializedAssessments[0].organizationName,
        fundName: serializedAssessments[0].fund.name,
        overallScore: serializedAssessments[0].overallScore,
        createdAt: serializedAssessments[0].createdAt
      });
    }

    const response = {
      success: true,
      assessments: serializedAssessments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };

    console.log('📤 Sending response with:', {
      success: response.success,
      assessmentCount: response.assessments.length,
      total: response.pagination.total
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error fetching assessments:', error);
    return NextResponse.json({
      error: 'Failed to fetch assessments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}