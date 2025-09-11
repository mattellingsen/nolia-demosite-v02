import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: NextRequest) {
  const stepResults: any[] = [];
  const startTime = Date.now();
  
  try {
    // Step 1: Test database connection
    const step1Start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    stepResults.push({
      step: 1,
      name: 'Database Connection',
      duration: Date.now() - step1Start,
      status: 'success'
    });

    // Step 2: Test basic fund creation (no files)
    const step2Start = Date.now();
    const testFund = await prisma.fund.create({
      data: {
        name: `Debug Test Fund ${Date.now()}`,
        description: 'Debug test fund for performance testing'
      }
    });
    stepResults.push({
      step: 2,
      name: 'Basic Fund Creation',
      duration: Date.now() - step2Start,
      status: 'success',
      fundId: testFund.id
    });

    // Step 3: Test S3 upload (small file)
    const step3Start = Date.now();
    try {
      const s3Client = new S3Client({
        region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'us-east-1',
        // Force IAM Role in production by not providing credentials if they start with ASIA
        ...(process.env.NODE_ENV === 'development' && 
            process.env.AWS_ACCESS_KEY_ID && 
            process.env.AWS_SECRET_ACCESS_KEY && 
            !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        } : {}),
      });

      const testContent = Buffer.from('Test file content for performance testing');
      const testKey = `debug-test/${Date.now()}.txt`;
      
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_DOCUMENTS,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
      }));
      
      stepResults.push({
        step: 3,
        name: 'S3 Upload Test',
        duration: Date.now() - step3Start,
        status: 'success',
        s3Key: testKey
      });
    } catch (s3Error) {
      stepResults.push({
        step: 3,
        name: 'S3 Upload Test',
        duration: Date.now() - step3Start,
        status: 'failed',
        error: s3Error instanceof Error ? s3Error.message : 'Unknown S3 error'
      });
    }

    // Step 4: Test document creation
    const step4Start = Date.now();
    try {
      const testDocument = await prisma.fundDocument.create({
        data: {
          fundId: testFund.id,
          documentType: 'APPLICATION_FORM',
          filename: 'debug-test.txt',
          mimeType: 'text/plain',
          fileSize: 100,
          s3Key: `debug-test/${Date.now()}.txt`
        }
      });
      
      stepResults.push({
        step: 4,
        name: 'Document Record Creation',
        duration: Date.now() - step4Start,
        status: 'success',
        documentId: testDocument.id
      });
    } catch (docError) {
      stepResults.push({
        step: 4,
        name: 'Document Record Creation',
        duration: Date.now() - step4Start,
        status: 'failed',
        error: docError instanceof Error ? docError.message : 'Unknown document error'
      });
    }

    // Step 5: Test background job creation
    const step5Start = Date.now();
    try {
      const testJob = await prisma.backgroundJob.create({
        data: {
          fundId: testFund.id,
          type: 'RAG_PROCESSING',
          totalDocuments: 1,
          metadata: { test: true }
        }
      });
      
      stepResults.push({
        step: 5,
        name: 'Background Job Creation',
        duration: Date.now() - step5Start,
        status: 'success',
        jobId: testJob.id
      });
    } catch (jobError) {
      stepResults.push({
        step: 5,
        name: 'Background Job Creation',
        duration: Date.now() - step5Start,
        status: 'failed',
        error: jobError instanceof Error ? jobError.message : 'Unknown job error'
      });
    }

    // Cleanup test data
    const cleanupStart = Date.now();
    try {
      await prisma.fund.delete({ where: { id: testFund.id } }); // Cascade will delete related records
      stepResults.push({
        step: 6,
        name: 'Cleanup',
        duration: Date.now() - cleanupStart,
        status: 'success'
      });
    } catch (cleanupError) {
      stepResults.push({
        step: 6,
        name: 'Cleanup',
        duration: Date.now() - cleanupStart,
        status: 'failed',
        error: cleanupError instanceof Error ? cleanupError.message : 'Cleanup failed'
      });
    }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      totalDuration,
      steps: stepResults,
      slowestStep: stepResults.reduce((slowest, current) => 
        current.duration > slowest.duration ? current : slowest
      ),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION,
        noliaRegion: process.env.NOLIA_AWS_REGION || 'not-set',
        standardRegion: process.env.AWS_REGION || 'not-set',
        hasAwsCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
        accessKeyExists: !!process.env.AWS_ACCESS_KEY_ID,
        secretKeyExists: !!process.env.AWS_SECRET_ACCESS_KEY,
        accessKeyPreview: process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 10) + '...' : 'not-set',
        bucketName: process.env.S3_BUCKET_DOCUMENTS || 'not-set'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalDuration: Date.now() - startTime,
      steps: stepResults
    }, { status: 500 });
  }
}