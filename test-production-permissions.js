#!/usr/bin/env node

/**
 * Test script to verify production IAM permissions for assessment workflow
 * Run this locally to check what permissions the production IAM role needs
 */

const https = require('https');

const productionUrl = 'https://main.d2l8hlr3sei3te.amplifyapp.com';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(productionUrl + path);

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function testProductionEndpoints() {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Testing Production IAM Permissions for Assessment Workflow${colors.reset}`);
  console.log(`${colors.cyan}Production URL: ${productionUrl}${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  const tests = [
    {
      name: 'Database Connection',
      path: '/api/debug-database',
      checkFor: ['connected', 'funds'],
      required: true
    },
    {
      name: 'AWS Configuration',
      path: '/api/debug-aws-config',
      checkFor: ['AWS_REGION', 'ap-southeast-2'],
      required: true
    },
    {
      name: 'S3 Permissions',
      path: '/api/test-connections',
      checkFor: ['s3', 'success'],
      required: true
    },
    {
      name: 'Funds API',
      path: '/api/funds',
      checkFor: ['funds'],
      required: true
    },
    {
      name: 'Assessments API',
      path: '/api/assessments',
      checkFor: ['assessments'],
      required: true
    }
  ];

  let allPassed = true;
  const results = [];

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);

    try {
      const result = await makeRequest(test.path);
      const responseStr = JSON.stringify(result.data).toLowerCase();

      let passed = true;
      const foundChecks = [];
      const missingChecks = [];

      for (const check of test.checkFor) {
        if (responseStr.includes(check.toLowerCase())) {
          foundChecks.push(check);
        } else {
          missingChecks.push(check);
          passed = false;
        }
      }

      if (result.status === 200 && passed) {
        console.log(`${colors.green}✓ PASSED${colors.reset}`);
        results.push({
          test: test.name,
          status: 'PASSED',
          details: `Found: ${foundChecks.join(', ')}`
        });
      } else if (result.status === 200) {
        console.log(`${colors.yellow}⚠ PARTIAL${colors.reset} - Missing: ${missingChecks.join(', ')}`);
        results.push({
          test: test.name,
          status: 'PARTIAL',
          details: `Found: ${foundChecks.join(', ')}, Missing: ${missingChecks.join(', ')}`
        });
        if (test.required) allPassed = false;
      } else {
        console.log(`${colors.red}✗ FAILED${colors.reset} - Status: ${result.status}`);
        results.push({
          test: test.name,
          status: 'FAILED',
          details: `HTTP ${result.status}: ${JSON.stringify(result.data).substring(0, 100)}`
        });
        if (test.required) allPassed = false;
      }

    } catch (error) {
      console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
      results.push({
        test: test.name,
        status: 'ERROR',
        details: error.message
      });
      if (test.required) allPassed = false;
    }
  }

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Required IAM Permissions for Assessment Workflow${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log('The Amplify app IAM role needs the following permissions:\n');

  console.log(`${colors.yellow}1. AWS Bedrock (Claude API):${colors.reset}`);
  console.log('   - bedrock:InvokeModel');
  console.log('   - bedrock:InvokeModelWithResponseStream');
  console.log('   Resource: arn:aws:bedrock:ap-southeast-2:*:foundation-model/anthropic.claude-*\n');

  console.log(`${colors.yellow}2. S3 (Document Storage):${colors.reset}`);
  console.log('   - s3:GetObject');
  console.log('   - s3:PutObject');
  console.log('   - s3:DeleteObject');
  console.log('   - s3:ListBucket');
  console.log('   Resource: arn:aws:s3:::nolia-funding-documents-*/*\n');

  console.log(`${colors.yellow}3. RDS (Database):${colors.reset}`);
  console.log('   - Should be configured via DATABASE_URL environment variable');
  console.log('   - No IAM permissions needed if using username/password auth\n');

  console.log(`${colors.yellow}4. SQS (Optional - for queue processing):${colors.reset}`);
  console.log('   - sqs:SendMessage');
  console.log('   - sqs:ReceiveMessage');
  console.log('   - sqs:DeleteMessage');
  console.log('   Resource: arn:aws:sqs:ap-southeast-2:*:nolia-funding-*\n');

  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Test Results Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  results.forEach(r => {
    const statusColor = r.status === 'PASSED' ? colors.green :
                       r.status === 'PARTIAL' ? colors.yellow :
                       colors.red;
    console.log(`${statusColor}${r.test}: ${r.status}${colors.reset}`);
    console.log(`  ${r.details}\n`);
  });

  if (allPassed) {
    console.log(`${colors.green}✅ All required tests passed!${colors.reset}`);
    console.log('Basic AWS services are accessible. Check CloudWatch logs for Bedrock-specific errors.\n');
  } else {
    console.log(`${colors.red}❌ Some required tests failed.${colors.reset}`);
    console.log('Review the IAM role permissions in AWS Amplify console.\n');
  }

  console.log(`${colors.cyan}Next Steps:${colors.reset}`);
  console.log('1. Check AWS CloudWatch logs for your Amplify app');
  console.log('2. Look for errors related to Bedrock/Claude API calls');
  console.log('3. Verify the IAM role has the permissions listed above');
  console.log('4. Test assessment workflow at: ' + productionUrl + '/funding/upload-applications\n');
}

testProductionEndpoints().catch(console.error);