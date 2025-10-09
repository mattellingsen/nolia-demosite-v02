#!/usr/bin/env node
/**
 * Test script to verify RAG pipeline components BEFORE production deployment
 * Tests: OpenSearch, Bedrock, OpenAI embeddings, S3 access
 */

require('dotenv').config({ path: '.env.local' });

async function testRAGPipeline() {
  console.log('🧪 Testing RAG Pipeline Components\n');

  const results = {
    opensearch: { status: 'pending', error: null },
    bedrock: { status: 'pending', error: null },
    openai: { status: 'pending', error: null },
    s3: { status: 'pending', error: null },
  };

  // Test 1: OpenSearch Connection
  console.log('1️⃣ Testing OpenSearch connection...');
  try {
    const endpoint = process.env.OPENSEARCH_ENDPOINT;
    const username = process.env.OPENSEARCH_USERNAME;
    const password = process.env.OPENSEARCH_PASSWORD;

    if (!endpoint || !username || !password) {
      throw new Error('Missing OpenSearch credentials in .env.local');
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ OpenSearch connected: ${data.version?.number || 'unknown version'}`);
      results.opensearch.status = 'success';
    } else {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    console.error(`❌ OpenSearch failed: ${error.message}`);
    results.opensearch.status = 'failed';
    results.opensearch.error = error.message;
  }

  // Test 2: OpenAI Embeddings
  console.log('\n2️⃣ Testing OpenAI embeddings...');
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey.includes('your-openai-api-key')) {
      throw new Error('Missing valid OPENAI_API_KEY in .env.local');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'Test embedding generation',
        model: 'text-embedding-3-small',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const embedding = data.data[0].embedding;
      console.log(`✅ OpenAI embeddings working (dimension: ${embedding.length})`);
      results.openai.status = 'success';
    } else {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`❌ OpenAI failed: ${error.message}`);
    results.openai.status = 'failed';
    results.openai.error = error.message;
  }

  // Test 3: AWS Bedrock
  console.log('\n3️⃣ Testing AWS Bedrock (Claude)...');
  try {
    const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
    const { getAWSCredentials } = require('./src/lib/aws-credentials.ts');

    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'ap-southeast-2',
      credentials: getAWSCredentials(),
    });

    const response = await client.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: 'Say "test successful" if you can read this.',
        }],
      }),
    }));

    const result = JSON.parse(new TextDecoder().decode(response.body));
    console.log(`✅ Bedrock working: ${result.content[0].text.substring(0, 50)}`);
    results.bedrock.status = 'success';
  } catch (error) {
    console.error(`❌ Bedrock failed: ${error.message}`);
    results.bedrock.status = 'failed';
    results.bedrock.error = error.message;
  }

  // Test 4: S3 Access
  console.log('\n4️⃣ Testing S3 bucket access...');
  try {
    const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const { getAWSCredentials } = require('./src/lib/aws-credentials.ts');

    const client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-2',
      credentials: getAWSCredentials(),
    });

    const response = await client.send(new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_DOCUMENTS || 'nolia-funding-documents-ap-southeast-2-599065966827',
      MaxKeys: 1,
    }));

    console.log(`✅ S3 access working (bucket has ${response.KeyCount || 0} objects in listing)`);
    results.s3.status = 'success';
  } catch (error) {
    console.error(`❌ S3 failed: ${error.message}`);
    results.s3.status = 'failed';
    results.s3.error = error.message;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY\n');

  const allPassed = Object.values(results).every(r => r.status === 'success');

  Object.entries(results).forEach(([component, result]) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${component.toUpperCase()}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Safe to deploy to production\n');
    process.exit(0);
  } else {
    console.log('❌ TESTS FAILED - DO NOT deploy until issues are resolved\n');
    process.exit(1);
  }
}

testRAGPipeline().catch(error => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
