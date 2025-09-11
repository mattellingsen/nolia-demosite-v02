import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET() {
  const results = {
    database: { status: 'unknown', error: null as string | null },
    s3: { status: 'unknown', error: null as string | null },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Missing',
      awsRegion: process.env.AWS_REGION || 'Missing',
      s3Bucket: process.env.S3_BUCKET_DOCUMENTS || 'Missing',
      opensearchEndpoint: process.env.OPENSEARCH_ENDPOINT ? 'Set' : 'Missing',
      openaiKey: process.env.OPENAI_API_KEY ? 'Set' : 'Missing',
      authMethod: 'IAM Role (no access keys)'
    }
  };

  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.database.status = 'connected';
  } catch (error) {
    results.database.status = 'failed';
    results.database.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test S3 connection
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      // No explicit credentials - will use IAM Role or default credential chain
    });

    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_DOCUMENTS,
      MaxKeys: 1
    });

    await s3Client.send(command);
    results.s3.status = 'connected';
  } catch (error) {
    results.s3.status = 'failed';
    results.s3.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json(results);
}