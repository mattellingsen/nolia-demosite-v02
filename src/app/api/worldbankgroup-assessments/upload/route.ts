import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { getAWSCredentials, AWS_REGION } from '@/lib/aws-credentials';

const prisma = new PrismaClient();

// Create a new S3Client on each request to get fresh credentials
// This is necessary because AWS SSO credentials expire and need to be refreshed
function getS3Client(): S3Client {
  const credentials = getAWSCredentials();
  return new S3Client({
    region: AWS_REGION,
    ...(credentials && { credentials }),
  });
}

// POST: Upload file and create PROCESSING assessment
export async function POST(req: NextRequest) {
  try {
    console.log('[WorldBankGroup Assessment Upload] Starting file upload and assessment creation');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const projectName = formData.get('projectName') as string;

    if (!file || !projectId || !projectName) {
      return NextResponse.json(
        { error: 'Missing required fields: file, projectId, or projectName' },
        { status: 400 }
      );
    }

    console.log(`📄 File details: ${file.name} (${file.size} bytes, ${file.type})`);

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

    // Upload file to S3
    const documentKey = `worldbankgroup-assessments/${projectId}/${crypto.randomUUID()}-${file.name}`;

    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      await getS3Client().send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_DOCUMENTS!,
        Key: documentKey,
        Body: fileBuffer,
        ContentType: file.type,
      }));

      console.log(`✅ File uploaded to S3: ${documentKey}`);
    } catch (uploadError) {
      console.error('❌ S3 upload failed:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to S3' },
        { status: 500 }
      );
    }

    // Create IN_PROGRESS assessment record
    const assessmentId = crypto.randomUUID();
    const assessment = await prisma.assessments.create({
      data: {
        id: assessmentId,
        fundId: projectId,
        organizationName: 'Processing...',
        projectName: projectName,
        assessmentType: 'AI_POWERED',
        status: 'IN_PROGRESS',
        overallScore: 0,
        scoringResults: { status: 'processing' },
        assessmentData: {
          evaluationReportS3Key: documentKey,
          evaluationReportFilename: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        },
        moduleType: 'WORLDBANKGROUP',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`✅ PROCESSING assessment created: ${assessmentId}`);

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id,
        fundId: assessment.fundId,
        projectName: projectName,
        filename: file.name,
        fileSize: file.size,
        status: 'PROCESSING',
        createdAt: assessment.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('[WorldBankGroup Assessment Upload] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file and create assessment',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
