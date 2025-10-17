import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { AssessmentType, AssessmentStatus } from '@prisma/client';

interface CreateWorldbankAssessmentRequest {
  projectId: string;
  organizationName: string;
  projectName?: string;
  assessmentType?: AssessmentType;
  overallScore?: number;
  scoringResults: any;
  assessmentData: any;
}

export async function POST(request: NextRequest) {
  console.log('📨 POST /api/worldbank-assessments: Received save request');
  try {
    const body: CreateWorldbankAssessmentRequest = await request.json();
    console.log('📋 Worldbank assessment data received:', {
      projectId: body.projectId,
      organizationName: body.organizationName,
      projectName: body.projectName,
      assessmentType: body.assessmentType,
      hasScoring: !!body.scoringResults,
      hasData: !!body.assessmentData
    });
    const {
      projectId,
      organizationName,
      projectName,
      assessmentType = AssessmentType.AI_POWERED,
      overallScore,
      scoringResults,
      assessmentData
    } = body;

    if (!projectId || !organizationName || !scoringResults || !assessmentData) {
      return NextResponse.json({
        error: 'Missing required fields: projectId, organizationName, scoringResults, assessmentData'
      }, { status: 400 });
    }

    // Verify project exists and is worldbank module
    const project = await prisma.funds.findUnique({
      where: {
        id: projectId,
        moduleType: 'WORLDBANK' // KEY: Ensure only worldbank projects
      }
    });

    if (!project) {
      return NextResponse.json({
        error: 'Project not found'
      }, { status: 404 });
    }

    // Create assessment record
    console.log('💾 Creating worldbank assessment in database...');
    const assessment = await prisma.assessments.create({
      data: {
        fundId: projectId, // Note: In database, we still use fundId but it refers to project
        organizationName,
        projectName,
        assessmentType,
        status: AssessmentStatus.COMPLETED,
        overallScore,
        scoringResults,
        assessmentData,
        moduleType: 'WORLDBANK' // KEY: Set moduleType to WORLDBANK
      },
      include: {
        funds: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    console.log('✅ Worldbank assessment created successfully:', assessment.id, assessment.organizationName);

    return NextResponse.json({
      success: true,
      assessment,
      message: 'Worldbank assessment saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving worldbank assessment:', error);
    return NextResponse.json({
      error: 'Failed to save worldbank assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('📨 GET /api/worldbank-assessments: Received fetch request');

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 Query parameters:', { projectId, limit, offset });

    // Build where clause - KEY: Filter by moduleType = WORLDBANK
    const where = {
      moduleType: 'WORLDBANK', // KEY: Only worldbank assessments
      ...(projectId ? { fundId: projectId } : {})
    };

    const assessments = await prisma.assessments.findMany({
      where,
      include: {
        funds: {
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

    console.log(`✅ Found ${assessments.length} worldbank assessments`);

    // Convert Decimal fields to numbers for JSON serialization
    const serializedAssessments = assessments.map(assessment => ({
      ...assessment,
      overallScore: assessment.overallScore ? Number(assessment.overallScore) : null
    }));

    // Get total count for pagination
    const total = await prisma.assessments.count({ where });

    console.log(`📊 Total worldbank assessments in database: ${total}`);

    // Log first assessment for debugging
    if (serializedAssessments.length > 0) {
      console.log('📝 First worldbank assessment:', {
        id: serializedAssessments[0].id,
        organizationName: serializedAssessments[0].organizationName,
        projectName: serializedAssessments[0].fund.name,
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
    console.error('❌ Error fetching worldbank assessments:', error);
    return NextResponse.json({
      error: 'Failed to fetch worldbank assessments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
