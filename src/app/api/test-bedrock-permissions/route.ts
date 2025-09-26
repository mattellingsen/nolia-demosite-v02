import { NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
    tests: {
      bedrockClient: false,
      claudeInvoke: false,
      permissions: []
    },
    errors: []
  };

  try {
    // Test 1: Can we create a Bedrock client?
    const bedrock = new BedrockRuntimeClient({
      region: results.region,
      // In production, this will use IAM role
    });
    results.tests.bedrockClient = true;

    // Test 2: Can we invoke Claude model?
    try {
      const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 10,
          messages: [{
            role: "user",
            content: "Say 'test' in one word"
          }]
        }),
        contentType: "application/json",
      });

      const response = await bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      results.tests.claudeInvoke = true;
      results.tests.permissions.push('bedrock:InvokeModel - GRANTED');

    } catch (error: any) {
      results.errors.push({
        test: 'claudeInvoke',
        message: error.message,
        code: error.name
      });

      // Analyze error to determine what permission is missing
      if (error.message.includes('AccessDeniedException')) {
        results.tests.permissions.push('bedrock:InvokeModel - DENIED');
      } else if (error.message.includes('credentials')) {
        results.tests.permissions.push('IAM Role/Credentials - MISSING OR INVALID');
      } else {
        results.tests.permissions.push('Unknown permission issue');
      }
    }

    // Test 3: Check what models we can access
    try {
      // Try to invoke a simple model to test permissions
      const testModels = [
        'anthropic.claude-3-haiku-20240307-v1:0',
        'anthropic.claude-3-sonnet-20240229-v1:0'
      ];

      for (const modelId of testModels) {
        try {
          const command = new InvokeModelCommand({
            modelId,
            body: JSON.stringify({
              anthropic_version: "bedrock-2023-05-31",
              max_tokens: 1,
              messages: [{
                role: "user",
                content: "1"
              }]
            }),
            contentType: "application/json",
          });

          await bedrock.send(command);
          results.tests.permissions.push(`${modelId} - ACCESSIBLE`);
        } catch (e: any) {
          if (e.message.includes('AccessDeniedException')) {
            results.tests.permissions.push(`${modelId} - ACCESS DENIED`);
          }
        }
      }
    } catch (error: any) {
      results.errors.push({
        test: 'modelAccess',
        message: error.message
      });
    }

  } catch (error: any) {
    results.errors.push({
      test: 'bedrockClient',
      message: error.message,
      stack: error.stack
    });
  }

  // Generate summary
  const allTestsPassed = results.tests.bedrockClient && results.tests.claudeInvoke;

  return NextResponse.json({
    success: allTestsPassed,
    message: allTestsPassed
      ? '✅ Bedrock/Claude permissions are working!'
      : '❌ Bedrock/Claude permissions need to be configured',
    results,
    recommendations: !allTestsPassed ? [
      'Add bedrock:InvokeModel permission to the Amplify IAM role',
      'Ensure the role has access to anthropic.claude-* models',
      'Check CloudWatch logs for detailed error messages',
      'Verify AWS_REGION is set to ap-southeast-2 in Amplify environment variables'
    ] : []
  });
}