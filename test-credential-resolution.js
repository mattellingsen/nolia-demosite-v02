// Test script to understand AWS SDK credential resolution
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

console.log('\n=== AWS SDK Credential Resolution Test ===\n');

// Log current environment
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('AWS_PROFILE:', process.env.AWS_PROFILE);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 10)}...` : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('AWS_SESSION_TOKEN:', process.env.AWS_SESSION_TOKEN ? `${process.env.AWS_SESSION_TOKEN.substring(0, 20)}...` : 'NOT SET');
console.log('AWS_SDK_LOAD_CONFIG:', process.env.AWS_SDK_LOAD_CONFIG);
console.log('AWS_CONFIG_FILE:', process.env.AWS_CONFIG_FILE);
console.log('AWS_SHARED_CREDENTIALS_FILE:', process.env.AWS_SHARED_CREDENTIALS_FILE);

console.log('\n--- Testing credential resolution ---\n');

// Test 1: Create client without any config
console.log('Test 1: Client without config');
const client1 = new S3Client({ region: 'ap-southeast-2' });
console.log('Client created successfully');

// Test 2: Try to use the client
async function testCredentials() {
  try {
    console.log('\nAttempting to list buckets...');
    const command = new ListBucketsCommand({});
    const response = await client1.send(command);
    console.log('✅ SUCCESS: Listed', response.Buckets?.length || 0, 'buckets');

    // Try to get the resolved credentials
    const credentials = await client1.config.credentials();
    console.log('\nResolved credentials:');
    console.log('AccessKeyId:', credentials.accessKeyId?.substring(0, 10) + '...');
    console.log('SecretAccessKey:', credentials.secretAccessKey ? 'SET' : 'NOT SET');
    console.log('SessionToken:', credentials.sessionToken ? credentials.sessionToken.substring(0, 20) + '...' : 'NOT SET');
    console.log('Expiration:', credentials.expiration);

    // Check if it's temporary credentials
    if (credentials.accessKeyId?.startsWith('ASIA')) {
      console.log('\n⚠️  WARNING: Using temporary credentials (starts with ASIA)');
      if (credentials.expiration) {
        const now = new Date();
        const exp = new Date(credentials.expiration);
        const hoursLeft = (exp - now) / (1000 * 60 * 60);
        console.log(`Token expires at: ${exp.toISOString()}`);
        console.log(`Hours remaining: ${hoursLeft.toFixed(2)}`);

        if (hoursLeft < 0) {
          console.log('❌ TOKEN IS EXPIRED!');
        }
      }
    } else if (credentials.accessKeyId?.startsWith('AKIA')) {
      console.log('\n✅ Using permanent IAM credentials');
    } else {
      console.log('\n🔐 Using IAM role or other credential source');
    }

  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('Error code:', error.$metadata?.httpStatusCode);

    // Check if it's an expired token error
    if (error.message.includes('expired')) {
      console.log('\n⚠️  This is a token expiration error!');
      console.log('The credentials being used have expired.');
    }
  }
}

// Test 3: Simulate forceIAMRole
console.log('\n--- Test 3: Simulating forceIAMRole ---');
function simulateForceIAMRole() {
  console.log('Deleting credential environment variables...');
  delete process.env.AWS_PROFILE;
  delete process.env.AWS_SDK_LOAD_CONFIG;
  delete process.env.AWS_CONFIG_FILE;
  delete process.env.AWS_SHARED_CREDENTIALS_FILE;
  process.env.AWS_SDK_LOAD_CONFIG = '0';

  console.log('AWS_PROFILE after delete:', process.env.AWS_PROFILE);
  console.log('AWS_SDK_LOAD_CONFIG after delete:', process.env.AWS_SDK_LOAD_CONFIG);
}

simulateForceIAMRole();

// Create new client after forceIAMRole
console.log('\nCreating new client after forceIAMRole...');
const client2 = new S3Client({ region: 'ap-southeast-2' });

async function testAfterForce() {
  try {
    console.log('Testing with new client...');
    const command = new ListBucketsCommand({});
    const response = await client2.send(command);
    console.log('✅ SUCCESS after forceIAMRole');
  } catch (error) {
    console.log('❌ ERROR after forceIAMRole:', error.message);
  }
}

// Run tests
testCredentials().then(() => {
  console.log('\n--- After forceIAMRole simulation ---');
  return testAfterForce();
}).then(() => {
  console.log('\n=== Test Complete ===\n');
});