// Test if environment variables can be baked into build
console.log('\n=== Build-Time Environment Test ===\n');

// Simulate what might happen during Amplify build
console.log('Current process environment variables:');
console.log('AWS_PROFILE:', process.env.AWS_PROFILE);
console.log('HOME:', process.env.HOME);
console.log('USER:', process.env.USER);

// Check if AWS config files exist
const fs = require('fs');
const path = require('path');

const awsDir = path.join(process.env.HOME || '/home/user', '.aws');
console.log('\n--- Checking AWS config files ---');
console.log('AWS directory:', awsDir);

if (fs.existsSync(awsDir)) {
  console.log('✅ AWS directory exists');

  const configFile = path.join(awsDir, 'config');
  const credsFile = path.join(awsDir, 'credentials');

  if (fs.existsSync(configFile)) {
    console.log('✅ config file exists');
    const content = fs.readFileSync(configFile, 'utf8');
    const profiles = content.match(/\[profile [^\]]+\]/g) || [];
    console.log(`  Found ${profiles.length} profiles:`, profiles.slice(0, 3).join(', '));
  }

  if (fs.existsSync(credsFile)) {
    console.log('✅ credentials file exists');
  }

  const ssoDir = path.join(awsDir, 'sso', 'cache');
  if (fs.existsSync(ssoDir)) {
    const files = fs.readdirSync(ssoDir);
    console.log(`✅ SSO cache exists with ${files.length} files`);
  }
} else {
  console.log('❌ No AWS directory found');
}

console.log('\n--- Simulating Next.js build ---');

// This is what happens in Next.js when you build
const buildTimeEnv = {
  NODE_ENV: 'production',
  // These get baked into the build
  ...Object.keys(process.env).reduce((acc, key) => {
    if (key.startsWith('NEXT_PUBLIC_') || key === 'NODE_ENV') {
      acc[key] = process.env[key];
    }
    return acc;
  }, {})
};

console.log('Environment variables that would be baked into build:');
console.log(JSON.stringify(buildTimeEnv, null, 2));

console.log('\n--- Key insight ---');
console.log('If AWS_PROFILE is set during build time on Amplify:');
console.log('1. The build environment may have AWS config/credentials');
console.log('2. The SDK might initialize with those credentials');
console.log('3. forceIAMRole() runs AFTER SDK initialization');
console.log('4. Deleting env vars after SDK init may not help');

console.log('\n=== Test Complete ===\n');