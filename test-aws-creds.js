#!/usr/bin/env node

// Test script to verify AWS credentials work with the SDK
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testCredentials() {
  console.log('🧪 Testing AWS credentials with SDK...\n');

  // Show current environment
  console.log('Environment variables:');
  console.log(`  AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`  AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '***SET***' : 'NOT SET'}`);
  console.log(`  AWS_SESSION_TOKEN: ${process.env.AWS_SESSION_TOKEN ? process.env.AWS_SESSION_TOKEN.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`  AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
  console.log(`  AWS_PROFILE: ${process.env.AWS_PROFILE || 'NOT SET (good!)'}\n`);

  try {
    // Create S3 client using the same pattern as the app
    const s3Client = new S3Client({
      region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
      // Only use explicit credentials if they exist and are not temporary (ASIA)
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

    console.log('📡 Attempting to list S3 buckets...');
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);

    console.log(`\n✅ SUCCESS! Found ${response.Buckets.length} buckets`);
    console.log('First 3 buckets:', response.Buckets.slice(0, 3).map(b => b.Name));

    // Check if the app bucket exists
    const appBucket = 'nolia-funding-documents-ap-southeast-2-599065966827';
    const hasAppBucket = response.Buckets.some(b => b.Name === appBucket);
    console.log(`\n🪣 App bucket "${appBucket}": ${hasAppBucket ? '✓ Found' : '✗ Not found'}`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.name === 'ExpiredToken') {
      console.log('💡 Token expired. Run: source ./scripts/export-aws-creds.sh');
    } else if (error.name === 'InvalidUserID.NotFound') {
      console.log('💡 SSO session invalid. Run: source ./scripts/export-aws-creds.sh');
    }
  }
}

testCredentials();