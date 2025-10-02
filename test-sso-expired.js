// Test what happens when SSO cache has expired tokens
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

console.log('\n=== SSO Expired Token Test ===\n');

// Check SSO cache
const ssoDir = path.join(process.env.HOME, '.aws', 'sso', 'cache');
console.log('Checking SSO cache directory:', ssoDir);

if (fs.existsSync(ssoDir)) {
  const files = fs.readdirSync(ssoDir);
  console.log(`Found ${files.length} SSO cache files\n`);

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(ssoDir, file), 'utf8'));
      if (content.expiresAt) {
        const expires = new Date(content.expiresAt);
        const now = new Date();
        const hoursAgo = (now - expires) / (1000 * 60 * 60);

        console.log(`File: ${file.substring(0, 10)}...`);
        console.log(`  Start URL: ${content.startUrl}`);
        console.log(`  Expires at: ${content.expiresAt}`);

        if (hoursAgo > 0) {
          console.log(`  ⚠️  EXPIRED ${hoursAgo.toFixed(1)} hours ago`);
        } else {
          console.log(`  ✅ Valid for ${(-hoursAgo).toFixed(1)} more hours`);
        }
      }
    } catch (e) {
      // Skip invalid files
    }
  }
}

console.log('\n--- Testing credential resolution with SSO cache present ---\n');

// Test with default SDK behavior
async function testWithSSO() {
  console.log('Creating S3 client with default configuration...');
  const client = new S3Client({ region: 'ap-southeast-2' });

  try {
    console.log('Attempting to list buckets...');
    const response = await client.send(new ListBucketsCommand({}));
    console.log('✅ SUCCESS: SDK found valid credentials');

    const creds = await client.config.credentials();
    console.log('Credential type:', creds.accessKeyId?.substring(0, 4));

  } catch (error) {
    console.log('❌ ERROR:', error.message);

    if (error.message.includes('expired')) {
      console.log('\n⚠️  This confirms SSO token expiration is the issue!');
      console.log('The SDK is trying to use expired SSO credentials.');
    }
  }
}

console.log('\n--- Testing after clearing SSO environment ---\n');

// Clear SSO-related env vars
delete process.env.AWS_PROFILE;
delete process.env.AWS_SDK_LOAD_CONFIG;
process.env.AWS_SDK_LOAD_CONFIG = '0';

async function testAfterClear() {
  console.log('Creating S3 client after clearing SSO env vars...');
  const client = new S3Client({ region: 'ap-southeast-2' });

  try {
    console.log('Attempting to list buckets...');
    const response = await client.send(new ListBucketsCommand({}));
    console.log('✅ SUCCESS: Found alternative credentials');

    const creds = await client.config.credentials();
    console.log('Credential type:', creds.accessKeyId?.substring(0, 4));

  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

testWithSSO().then(() => {
  return testAfterClear();
}).then(() => {
  console.log('\n=== Test Complete ===\n');
});