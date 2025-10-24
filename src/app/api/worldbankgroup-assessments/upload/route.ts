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

// POST: Create PROCESSING assessment (file already uploaded to S3 via presigned URL)
export async function POST(req: NextRequest) {
  try {
    console.log('[WorldBankGroup Assessment Upload] Creating assessment record');

    const contentType = req.headers.get('content-type');

    // Support both old FormData flow (for backward compatibility) and new JSON flow
    let projectId: string;
    let projectName: string;
    let fileName: string;
    let fileSize: number;
    let fileType: string;
    let documentKey: string;

    if (contentType?.includes('application/json')) {
      // New presigned URL flow - file already in S3
      const body = await req.json();
      projectId = body.projectId;
      projectName = body.projectName;
      fileName = body.fileName;
      fileSize = body.fileSize;
      fileType = body.fileType;
      documentKey = body.documentKey;

      console.log(`📄 File already uploaded to S3: ${documentKey}`);
    } else {
      // Old FormData flow - upload file to S3 (kept for backward compatibility)
      const formData = await req.formData();
      const file = formData.get('file') as File;
      projectId = formData.get('projectId') as string;
      projectName = formData.get('projectName') as string;

      if (!file) {
        return NextResponse.json(
          { error: 'Missing file in FormData' },
          { status: 400 }
        );
      }

      fileName = file.name;
      fileSize = file.size;
      fileType = file.type;
      documentKey = `worldbankgroup-assessments/${projectId}/${crypto.randomUUID()}-${file.name}`;

      console.log(`📄 File details: ${file.name} (${file.size} bytes, ${file.type})`);

      // Upload file to S3
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
    }

    if (!projectId || !projectName || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, projectName, or fileName' },
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
          evaluationReportFilename: fileName,
          fileSize: fileSize,
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
        filename: fileName,
        fileSize: fileSize,
        status: 'PROCESSING',
        createdAt: assessment.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('[WorldBankGroup Assessment Upload] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create assessment',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
