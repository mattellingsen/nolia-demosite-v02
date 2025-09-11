import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET() {
  const debugResults = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {
      database: { status: 'unknown', error: null as string | null, details: null as any },
      s3: { status: 'unknown', error: null as string | null, details: null as any },
      openai: { status: 'unknown', error: null as string | null },
      prismaClient: { status: 'unknown', error: null as string | null }
    },
    environmentCheck: {
      databaseUrl: !!process.env.DATABASE_URL,
      awsRegion: process.env.AWS_REGION || 'missing',
      s3Bucket: process.env.S3_BUCKET_DOCUMENTS || 'missing',
      opensearchEndpoint: !!process.env.OPENSEARCH_ENDPOINT,
      openaiKey: !!process.env.OPENAI_API_KEY,
      adminKey: !!process.env.ADMIN_API_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  };

  // Test 1: Database Connection
  try {
    const dbTest = await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`;
    debugResults.tests.database.status = 'connected';
    debugResults.tests.database.details = dbTest;
  } catch (error) {
    debugResults.tests.database.status = 'failed';
    debugResults.tests.database.error = error instanceof Error ? error.message : 'Unknown database error';
  }

  // Test 2: Prisma Client Health
  try {
    await prisma.$connect();
    debugResults.tests.prismaClient.status = 'connected';
  } catch (error) {
    debugResults.tests.prismaClient.status = 'failed';
    debugResults.tests.prismaClient.error = error instanceof Error ? error.message : 'Unknown Prisma error';
  }

  // Test 3: S3 Connection
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      // Using default credential chain for IAM Role
    });

    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_DOCUMENTS,
      MaxKeys: 1
    });

    const response = await s3Client.send(command);
    debugResults.tests.s3.status = 'connected';
    debugResults.tests.s3.details = {
      bucket: process.env.S3_BUCKET_DOCUMENTS,
      objectCount: response.KeyCount || 0,
      region: process.env.AWS_REGION
    };
  } catch (error) {
    debugResults.tests.s3.status = 'failed';
    debugResults.tests.s3.error = error instanceof Error ? error.message : 'Unknown S3 error';
  }

  // Test 4: OpenAI API Key Format
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error('OpenAI API key not found');
    }
    if (!openaiKey.startsWith('sk-')) {
      throw new Error('OpenAI API key format invalid');
    }
    debugResults.tests.openai.status = 'key_present';
  } catch (error) {
    debugResults.tests.openai.status = 'failed';
    debugResults.tests.openai.error = error instanceof Error ? error.message : 'Unknown OpenAI error';
  }

  return NextResponse.json(debugResults, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

// Test fund creation flow specifically
export async function POST(request: NextRequest) {
  try {
    const { testMode = true } = await request.json();
    
    const fundCreationTest = {
      timestamp: new Date().toISOString(),
      testMode,
      steps: [] as Array<{step: string, status: string, error?: string, details?: any}>
    };

    // Step 1: Test database write
    try {
      if (testMode) {
        // Just test connection without creating
        await prisma.$queryRaw`SELECT 1`;
        fundCreationTest.steps.push({
          step: 'database_connection',
          status: 'success'
        });
      }
    } catch (error) {
      fundCreationTest.steps.push({
        step: 'database_connection',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Step 2: Test S3 write permissions
    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
      });

      // Test list permission (read)
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_DOCUMENTS,
        MaxKeys: 1
      });
      
      await s3Client.send(listCommand);
      fundCreationTest.steps.push({
        step: 's3_read_permission',
        status: 'success'
      });

    } catch (error) {
      fundCreationTest.steps.push({
        step: 's3_permissions',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return NextResponse.json(fundCreationTest);

  } catch (error) {
    return NextResponse.json({
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}