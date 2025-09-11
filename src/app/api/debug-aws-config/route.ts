import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        AWS_REGION: process.env.AWS_REGION || 'not-set',
        NOLIA_AWS_REGION: process.env.NOLIA_AWS_REGION || 'not-set',
        hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        accessKeyIdValue: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 10)}...` : 'not-set',
        secretAccessKeyValue: process.env.AWS_SECRET_ACCESS_KEY ? `${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 10)}...` : 'not-set',
        S3_BUCKET_DOCUMENTS: process.env.S3_BUCKET_DOCUMENTS || 'not-set',
        allAwsEnvVars: Object.keys(process.env)
          .filter(key => key.includes('AWS') || key.includes('NOLIA'))
          .reduce((acc, key) => {
            acc[key] = process.env[key]?.substring(0, 20) + '...';
            return acc;
          }, {} as Record<string, string>)
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}