import { NextRequest, NextResponse } from 'next/server';
import { S3Client, HeadBucketCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';

export async function GET() {
  const bucketName = process.env.S3_BUCKET_DOCUMENTS || 'nolia-funding-documents-599065966827';
  const testResults = {
    bucketName,
    timestamp: new Date().toISOString(),
    regionTests: [] as Array<{region: string, status: string, error?: string}>,
    actualRegion: null as string | null
  };

  // Test common regions
  const regionsToTest = ['us-east-1', 'ap-southeast-2', 'us-west-2', 'eu-west-1'];

  for (const region of regionsToTest) {
    try {
      const s3Client = new S3Client({
        region,
        // Use IAM Role - no explicit credentials
      });

      // Try to head the bucket to see if region is correct
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      
      testResults.regionTests.push({
        region,
        status: 'success'
      });

      // If successful, this is likely the correct region
      if (!testResults.actualRegion) {
        testResults.actualRegion = region;
      }

    } catch (error) {
      testResults.regionTests.push({
        region,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Try to get bucket location directly (works from any region)
  try {
    const s3Client = new S3Client({
      region: 'us-east-1', // Use us-east-1 as default for GetBucketLocation
    });

    const locationResponse = await s3Client.send(new GetBucketLocationCommand({
      Bucket: bucketName
    }));

    testResults.actualRegion = locationResponse.LocationConstraint || 'us-east-1';
  } catch (error) {
    console.error('Could not get bucket location:', error);
  }

  return NextResponse.json(testResults);
}