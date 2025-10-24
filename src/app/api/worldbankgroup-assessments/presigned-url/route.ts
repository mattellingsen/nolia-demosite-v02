import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from '@/lib/aws-credentials';

// Create S3 client
function getS3Client(): S3Client {
  const credentials = getAWSCredentials();
  return new S3Client({
    region: AWS_REGION,
    ...(credentials && { credentials }),
  });
}

// POST: Generate presigned URL for direct S3 upload
export async function POST(req: NextRequest) {
  try {
    console.log('[WorldBankGroup Presigned URL] Generating presigned URL for file upload');

    const body = await req.json();
    const { projectId, fileName, fileType } = body;

    if (!projectId || !fileName || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, fileName, or fileType' },
        { status: 400 }
      );
    }

    // Generate unique S3 key
    const documentKey = `worldbankgroup-assessments/${projectId}/${crypto.randomUUID()}-${fileName}`;

    console.log(`📝 Generating presigned URL for: ${documentKey}`);

    // Generate presigned URL (valid for 15 minutes)
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: documentKey,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(getS3Client(), command, {
      expiresIn: 900, // 15 minutes
    });

    console.log(`✅ Presigned URL generated successfully`);

    return NextResponse.json({
      success: true,
      presignedUrl,
      documentKey,
    });

  } catch (error) {
    console.error('[WorldBankGroup Presigned URL] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate presigned URL',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
