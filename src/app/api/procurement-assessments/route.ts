import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { AssessmentType, AssessmentStatus } from '@prisma/client';

interface CreateProcurementAssessmentRequest {
  tenderId: string;
  organizationName: string;
  projectName?: string;
  assessmentType?: AssessmentType;
  overallScore?: number;
  scoringResults: any;
  assessmentData: any;
}

export async function POST(request: NextRequest) {
  console.log('📨 POST /api/procurement-assessments: Received save request');
  try {
    const body: CreateProcurementAssessmentRequest = await request.json();
    console.log('📋 Procurement assessment data received:', {
      tenderId: body.tenderId,
      organizationName: body.organizationName,
      projectName: body.projectName,
      assessmentType: body.assessmentType,
      hasScoring: !!body.scoringResults,
      hasData: !!body.assessmentData
    });
    const {
      tenderId,
      organizationName,
      projectName,
      assessmentType = AssessmentType.AI_POWERED,
      overallScore,
      scoringResults,
      assessmentData
    } = body;

    if (!tenderId || !organizationName || !scoringResults || !assessmentData) {
      return NextResponse.json({
        error: 'Missing required fields: tenderId, organizationName, scoringResults, assessmentData'
      }, { status: 400 });
    }

    // Verify tender exists and is procurement module
    const tender = await prisma.funds.findUnique({
      where: {
        id: tenderId,
        moduleType: 'PROCUREMENT' // KEY: Ensure only procurement tenders
      }
    });

    if (!tender) {
      return NextResponse.json({
        error: 'Tender not found'
      }, { status: 404 });
    }

    // Create assessment record
    console.log('💾 Creating procurement assessment in database...');
    const assessment = await prisma.assessments.create({
      data: {
        fundId: tenderId, // Note: In database, we still use fundId but it refers to tender
        organizationName,
        projectName,
        assessmentType,
        status: AssessmentStatus.COMPLETED,
        overallScore,
        scoringResults,
        assessmentData,
        moduleType: 'PROCUREMENT' // KEY: Set moduleType to PROCUREMENT
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

    console.log('✅ Procurement assessment created successfully:', assessment.id, assessment.organizationName);

    return NextResponse.json({
      success: true,
      assessment,
      message: 'Procurement assessment saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving procurement assessment:', error);
    return NextResponse.json({
      error: 'Failed to save procurement assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('📨 GET /api/procurement-assessments: Received fetch request');

  try {
    const { searchParams } = new URL(request.url);
    const tenderId = searchParams.get('tenderId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 Query parameters:', { tenderId, limit, offset });

    // Build where clause - KEY: Filter by moduleType = PROCUREMENT
    const where = {
      moduleType: 'PROCUREMENT', // KEY: Only procurement assessments
      ...(tenderId ? { fundId: tenderId } : {})
    };

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

    console.log(`✅ Found ${assessments.length} procurement assessments`);

    // Convert Decimal fields to numbers for JSON serialization
    const serializedAssessments = assessments.map(assessment => ({
      ...assessment,
      overallScore: assessment.overallScore ? Number(assessment.overallScore) : null
    }));

    // Get total count for pagination
    const total = await prisma.assessments.count({ where });

    console.log(`📊 Total procurement assessments in database: ${total}`);

    // Log first assessment for debugging
    if (serializedAssessments.length > 0) {
      console.log('📝 First procurement assessment:', {
        id: serializedAssessments[0].id,
        organizationName: serializedAssessments[0].organizationName,
        tenderName: serializedAssessments[0].fund.name,
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
    console.error('❌ Error fetching procurement assessments:', error);
    return NextResponse.json({
      error: 'Failed to fetch procurement assessments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}