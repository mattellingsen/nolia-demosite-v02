import { NextRequest, NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { getAWSCredentials, AWS_REGION, S3_BUCKET } from '@/lib/aws-credentials';

export async function GET(req: NextRequest) {
  try {
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: getAWSCredentials(),
    });

    // Test if we can get credentials
    let credentialStatus = 'unknown';
    let credentialDetails = {};

    try {
      const credentials = await s3Client.config.credentials();
      credentialStatus = 'available';
      credentialDetails = {
        hasAccessKey: !!credentials?.accessKeyId,
        accessKeyPrefix: credentials?.accessKeyId ? credentials.accessKeyId.substring(0, 8) : 'NONE',
        hasSecretKey: !!credentials?.secretAccessKey,
        hasSessionToken: !!credentials?.sessionToken,
        expiration: credentials?.expiration?.toISOString() || 'no-expiration',
      };
    } catch (error) {
      credentialStatus = 'error';
      credentialDetails = {
        error: error instanceof Error ? error.message : String(error)
      };
    }

    return NextResponse.json({
      status: 'ok',
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        AWS_REGION: AWS_REGION,
        S3_BUCKET: S3_BUCKET,
        hasEnvAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasEnvSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        hasEnvSessionToken: !!process.env.AWS_SESSION_TOKEN,
        hasProfile: !!process.env.AWS_PROFILE,
        profile: process.env.AWS_PROFILE || 'none',
      },
      credentials: {
        status: credentialStatus,
        details: credentialDetails
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}