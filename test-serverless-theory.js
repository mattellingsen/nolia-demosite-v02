// Understanding the Amplify/Next.js serverless execution model

console.log('\n=== Understanding Amplify Serverless Execution ===\n');

console.log('How Next.js API routes work on Amplify:\n');

console.log('1. BUILD TIME (npm run build):');
console.log('   - Next.js compiles API routes');
console.log('   - Imports are resolved and bundled');
console.log('   - Module-level code is NOT executed yet');
console.log('   - Result: .next/server files created');

console.log('\n2. DEPLOYMENT:');
console.log('   - Amplify deploys .next files to Lambda@Edge or Lambda');
console.log('   - Each API route becomes a serverless function');
console.log('   - Environment variables from Amplify are injected');

console.log('\n3. COLD START (first request):');
console.log('   - Lambda container starts');
console.log('   - Node.js loads the module');
console.log('   - MODULE-LEVEL code executes NOW:');
console.log('     • import statements run');
console.log('     • forceIAMRole() executes');
console.log('     • S3Client is created');
console.log('   - Handler function is registered');

console.log('\n4. REQUEST HANDLING:');
console.log('   - Handler function (POST/GET) executes');
console.log('   - Uses the already-created S3Client');

console.log('\n5. WARM INVOCATIONS:');
console.log('   - Same Lambda container handles more requests');
console.log('   - Module-level code does NOT re-run');
console.log('   - S3Client instance is reused');

console.log('\n=== THE PROBLEM ===\n');

console.log('In production on Amplify:');
console.log('1. Lambda starts with env vars from Amplify config');
console.log('2. If AWS_PROFILE or expired SSO tokens exist in the Lambda environment:');
console.log('   - They could come from build environment');
console.log('   - Or from Amplify environment variables');
console.log('3. Module loads, forceIAMRole() runs, deletes env vars');
console.log('4. S3Client is created, but SDK might have already:');
console.log('   - Cached the credential provider chain');
console.log('   - Found ~/.aws/config or ~/.aws/credentials in Lambda');
console.log('   - Located SSO cache files');

console.log('\n=== HYPOTHESIS ===\n');

console.log('The "token expired" error suggests:');
console.log('1. The Lambda environment has SSO configuration files');
console.log('2. These files point to expired SSO tokens');
console.log('3. The SDK finds these BEFORE forceIAMRole can prevent it');
console.log('4. Or the SDK credential provider is initialized before forceIAMRole');

console.log('\n=== EVIDENCE NEEDED ===\n');

console.log('To confirm, we need to check in production:');
console.log('1. What env vars exist when Lambda starts?');
console.log('2. Does ~/.aws directory exist in Lambda?');
console.log('3. Are there SSO cache files in Lambda?');
console.log('4. What credential provider is the SDK actually using?');

console.log('\n');