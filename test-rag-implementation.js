// Test script for RAG implementation
// Run this after setting up the AWS services

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'test-admin-key';

async function testRAGHealthCheck() {
  console.log('\n🔍 Testing RAG Health Check...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/health/rag`);
    const data = await response.json();
    
    console.log('Health Check Response:', JSON.stringify(data, null, 2));
    
    if (data.status === 'healthy') {
      console.log('✅ RAG system is healthy');
      return true;
    } else {
      console.log(`⚠️ RAG system status: ${data.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testRAGInitialization() {
  console.log('\n🚀 Testing RAG Initialization...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/initialize-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('Initialization Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ RAG system initialized successfully');
      return true;
    } else {
      console.log('⚠️ RAG initialization had errors:', data.errors);
      return false;
    }
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    return false;
  }
}

async function testAssessmentAPI() {
  console.log('\n📝 Testing AI Assessment API...');
  
  const testData = {
    applicationText: `
      Our startup, EcoTech Solutions, is developing innovative solar panel technology 
      that increases efficiency by 30% compared to traditional panels. We are seeking 
      $500,000 in funding to scale our manufacturing operations and bring our product 
      to market. Our team has 10 years of combined experience in renewable energy, 
      and we have already secured partnerships with three major distributors. 
      We project breaking even within 18 months and generating $2M in revenue by year two.
    `,
    fundId: 'test-fund-123',
    assessmentType: 'scoring'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/assess-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const data = await response.json();
    console.log('Assessment Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.assessment) {
      console.log('✅ Assessment API working');
      console.log(`Score: ${data.assessment.score}`);
      console.log(`Feedback: ${data.assessment.feedback}`);
      return true;
    } else {
      console.log('❌ Assessment API failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Assessment test failed:', error.message);
    return false;
  }
}

async function testBatchAssessmentAPI() {
  console.log('\n📊 Testing Batch Assessment API...');
  
  const testData = {
    applications: [
      {
        id: 'app-001',
        text: 'Small tech startup seeking $100K for mobile app development.'
      },
      {
        id: 'app-002', 
        text: 'Established manufacturing company requesting $1M for equipment upgrade and sustainable practices implementation.'
      }
    ],
    fundId: 'test-fund-123'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/batch-assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const data = await response.json();
    console.log('Batch Assessment Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.results) {
      console.log('✅ Batch Assessment API working');
      console.log(`Processed: ${data.summary.successful}/${data.summary.total} applications`);
      console.log(`Average Score: ${data.summary.averageScore}`);
      return true;
    } else {
      console.log('❌ Batch Assessment API failed:', data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Batch assessment test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting RAG Implementation Test Suite');
  console.log('=====================================');
  
  const results = {
    healthCheck: false,
    initialization: false,
    assessment: false,
    batchAssessment: false,
  };
  
  // Test 1: Health Check
  results.healthCheck = await testRAGHealthCheck();
  
  // Test 2: Initialization (if health check passes)
  if (results.healthCheck) {
    results.initialization = await testRAGInitialization();
  } else {
    console.log('⏭️ Skipping initialization test due to health check failure');
  }
  
  // Test 3: Single Assessment
  results.assessment = await testAssessmentAPI();
  
  // Test 4: Batch Assessment
  results.batchAssessment = await testBatchAssessmentAPI();
  
  // Summary
  console.log('\n📋 Test Results Summary');
  console.log('======================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n📊 Overall: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All tests passed! RAG implementation is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
    console.log('\n💡 Next steps:');
    console.log('1. Ensure AWS services are properly configured');
    console.log('2. Check environment variables in .env.production');
    console.log('3. Verify OpenSearch cluster is running');
    console.log('4. Confirm AWS Bedrock permissions are set up');
  }
}

// Run the tests
runAllTests().catch(console.error);