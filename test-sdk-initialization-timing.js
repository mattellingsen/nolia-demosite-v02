// Test when AWS SDK actually resolves credentials
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

console.log('\n=== AWS SDK Credential Resolution Timing Test ===\n');

console.log('Step 1: Set AWS_PROFILE to simulate build environment');
process.env.AWS_PROFILE = 'springload-dev';
process.env.AWS_SDK_LOAD_CONFIG = '1';
console.log('AWS_PROFILE set to:', process.env.AWS_PROFILE);

console.log('\nStep 2: Import and create S3Client (simulates module load)');
const client1 = new S3Client({ region: 'ap-southeast-2' });
console.log('Client created. Credentials NOT resolved yet (lazy loading).');

console.log('\nStep 3: NOW delete environment variables (simulates forceIAMRole)');
delete process.env.AWS_PROFILE;
delete process.env.AWS_SDK_LOAD_CONFIG;
process.env.AWS_SDK_LOAD_CONFIG = '0';
console.log('AWS_PROFILE after delete:', process.env.AWS_PROFILE);

console.log('\nStep 4: Try to use the client created BEFORE env var deletion');
async function testClient1() {
  try {
    const command = new ListBucketsCommand({});
    console.log('Sending command with client1...');
    await client1.send(command);
    console.log('✅ SUCCESS with client1');

    const creds = await client1.config.credentials();
    console.log('Client1 is using credentials:', creds.accessKeyId?.substring(0, 10) + '...');

  } catch (error) {
    console.log('❌ ERROR with client1:', error.message);

    if (error.message.includes('expired')) {
      console.log('\n🔴 CRITICAL: Client created before forceIAMRole() still uses expired SSO!');
      console.log('This is the root cause - the client was created with SSO config');
      console.log('and deleting env vars AFTER creation does not help.');
    }
  }
}

console.log('\nStep 5: Create NEW client AFTER env var deletion');
const client2 = new S3Client({ region: 'ap-southeast-2' });

async function testClient2() {
  try {
    console.log('Sending command with client2...');
    await client2.send(new ListBucketsCommand({}));
    console.log('✅ SUCCESS with client2');

    const creds = await client2.config.credentials();
    console.log('Client2 is using credentials:', creds.accessKeyId?.substring(0, 10) + '...');

  } catch (error) {
    console.log('❌ ERROR with client2:', error.message);
  }
}

console.log('\n--- Running tests ---\n');

testClient1().then(() => {
  console.log('\n--- Testing new client ---\n');
  return testClient2();
}).then(() => {
  console.log('\n=== CONCLUSION ===');
  console.log('If S3Client is created at module load time (before forceIAMRole runs),');
  console.log('it captures the credential provider chain at that moment.');
  console.log('Deleting env vars later does NOT affect already-created clients.');
  console.log('\nThe fix needs to ensure forceIAMRole() runs BEFORE creating AWS clients.');
  console.log('===================\n');
});