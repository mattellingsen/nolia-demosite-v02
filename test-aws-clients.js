#!/usr/bin/env node

/**
 * Test script to verify all AWS SDK clients are properly configured
 * Run this after deployment to ensure forceIAMRole() is working correctly
 */

const path = require('path');
const { execSync } = require('child_process');

// Set environment to production to test IAM role forcing
process.env.NODE_ENV = 'production';
process.env.NOLIA_AWS_REGION = 'ap-southeast-2';
process.env.AWS_REGION = 'ap-southeast-2';
process.env.S3_BUCKET_DOCUMENTS = 'nolia-funding-documents-ap-southeast-2-599065966827';

// Intentionally set SSO-related vars to test if they get cleared
process.env.AWS_PROFILE = 'test-profile';
process.env.AWS_SDK_LOAD_CONFIG = '1';

console.log('🧪 Testing AWS Client Configurations...\n');
console.log('Initial environment:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  AWS_PROFILE: ${process.env.AWS_PROFILE}`);
console.log(`  AWS_SDK_LOAD_CONFIG: ${process.env.AWS_SDK_LOAD_CONFIG}`);
console.log('');

// Test each module that creates AWS clients
const modules = [
  './src/lib/database-s3.ts',
  './src/lib/aws-opensearch.ts',
  './src/lib/aws-bedrock.ts',
  './src/lib/claude-service.ts',
  './src/lib/sqs-service.ts',
  './src/lib/background-job-service.ts'
];

console.log('📦 Testing module imports...\n');

for (const modulePath of modules) {
  try {
    console.log(`Testing: ${modulePath}`);

    // Clear module cache to force re-import
    const fullPath = path.resolve(modulePath);
    delete require.cache[fullPath];

    // Import the module (this will run forceIAMRole if properly configured)
    require(fullPath);

    // Check if SSO vars were cleared
    if (process.env.AWS_PROFILE === undefined && process.env.AWS_SDK_LOAD_CONFIG === '0') {
      console.log(`  ✅ forceIAMRole() executed - SSO vars cleared`);
    } else {
      console.log(`  ⚠️  WARNING: SSO vars still present after import`);
      console.log(`     AWS_PROFILE: ${process.env.AWS_PROFILE}`);
      console.log(`     AWS_SDK_LOAD_CONFIG: ${process.env.AWS_SDK_LOAD_CONFIG}`);
    }

    // Reset for next test
    process.env.AWS_PROFILE = 'test-profile';
    process.env.AWS_SDK_LOAD_CONFIG = '1';

  } catch (error) {
    console.log(`  ❌ Error importing module: ${error.message}`);
  }
  console.log('');
}

console.log('\n🏁 Test Summary:');
console.log('If all modules show "✅ forceIAMRole() executed", the fix is working correctly.');
console.log('Deploy these changes to production to resolve the token expiration errors.');