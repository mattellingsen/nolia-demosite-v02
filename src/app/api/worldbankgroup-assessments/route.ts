import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { getAWSCredentials, AWS_REGION } from '@/lib/aws-credentials';
import { mockAssessmentOutput } from '@/lib/worldbankgroup-mock-data';

const prisma = new PrismaClient();

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const credentials = getAWSCredentials();
    s3Client = new S3Client({
      region: AWS_REGION,
      ...(credentials && { credentials }),
    });
  }
  return s3Client;
}

// POST: Create assessment (FAKE DEMO - returns hardcoded results)
export async function POST(req: NextRequest) {
  try {
    console.log('[WorldBankGroup Assessment] Creating new assessment (FAKE DEMO)');

    const body = await req.json();
    const { projectId, organizationName, evaluationReportFile } = body;

    if (!projectId || !organizationName || !evaluationReportFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.funds.findFirst({
      where: {
        id: projectId,
        moduleType: 'WORLDBANKGROUP'
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'WorldBankGroup project not found' },
        { status: 404 }
      );
    }

    // Upload evaluation report to S3 (REAL UPLOAD)
    const documentKey = `worldbankgroup-assessments/${projectId}/${crypto.randomUUID()}-${evaluationReportFile.filename}`;

    try {
      const fileBuffer = Buffer.from(evaluationReportFile.content, 'base64');

      await getS3Client().send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_DOCUMENTS!,
        Key: documentKey,
        Body: fileBuffer,
        ContentType: evaluationReportFile.mimeType,
      }));

      console.log('✅ [WorldBankGroup Assessment] Evaluation report uploaded to S3');
    } catch (uploadError) {
      console.error('❌ [WorldBankGroup Assessment] S3 upload failed:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload evaluation report' },
        { status: 500 }
      );
    }

    // FAKE DEMO: Generate hardcoded assessment output
    console.log('🎭 [WorldBankGroup Assessment FAKE DEMO] Using hardcoded assessment output');
    const mockOutput = mockAssessmentOutput();

    // Create assessment record with mock data
    const assessment = await prisma.assessments.create({
      data: {
        id: crypto.randomUUID(),
        fundId: projectId,
        organizationName,
        assessmentType: 'AI_POWERED',
        status: 'COMPLETED',
        overallScore: mockOutput.summary.complianceScore,
        scoringResults: mockOutput,
        assessmentData: {
          evaluationReportS3Key: documentKey,
          evaluationReportFilename: evaluationReportFile.filename,
          fakeDemo: true
        },
        moduleType: 'WORLDBANKGROUP',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ [WorldBankGroup Assessment FAKE DEMO] Assessment created with hardcoded results:', assessment.id);

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        fundId: assessment.fundId,
        organizationName: assessment.organizationName,
        status: assessment.status,
        overallScore: assessment.overallScore,
        scoringResults: assessment.scoringResults,
        createdAt: assessment.createdAt.toISOString()
      },
      fakeDemo: true,
      demoNote: 'This assessment uses pre-written output for demonstration purposes.'
    });

  } catch (error) {
    console.error('[WorldBankGroup Assessment] Error creating assessment:', error);
    return NextResponse.json(
      {
        error: 'Failed to create assessment',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// GET: List all assessments for a project
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const assessments = await prisma.assessments.findMany({
      where: {
        fundId: projectId,
        moduleType: 'WORLDBANKGROUP'
      },
      select: {
        id: true,
        organizationName: true,
        status: true,
        overallScore: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      assessments: assessments.map(a => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString()
      })),
      fakeDemo: true
    });

  } catch (error) {
    console.error('[WorldBankGroup Assessment] Error fetching assessments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}
