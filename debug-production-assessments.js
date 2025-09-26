#!/usr/bin/env node

/**
 * Production Assessment Debugging Script
 * Tests the production API and database to identify assessment workflow issues
 */

const https = require('https');

const PRODUCTION_URL = 'main.d2l8hlr3sei3te.amplifyapp.com';

// Helper function to make HTTPS requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: PRODUCTION_URL,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };

    if (data && method !== 'GET') {
      const payload = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`\nResponse Status: ${res.statusCode}`);
        console.log(`Response Headers:`, res.headers);

        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          // If not JSON, return raw response
          resolve({ status: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function debugProductionAssessments() {
  console.log('='.repeat(80));
  console.log('PRODUCTION ASSESSMENT DEBUGGING');
  console.log('='.repeat(80));
  console.log(`Production URL: https://${PRODUCTION_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Test 1: Check GET /api/assessments endpoint
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: Checking GET /api/assessments');
    console.log('='.repeat(80));

    const assessmentsResponse = await makeRequest('/api/assessments');

    if (assessmentsResponse.status === 200) {
      console.log('\n✅ API endpoint is accessible');
      console.log('Raw response data:', JSON.stringify(assessmentsResponse.data, null, 2));
      console.log('Response type:', typeof assessmentsResponse.data);

      // Handle the wrapped response format
      let assessments = [];
      if (assessmentsResponse.data && assessmentsResponse.data.assessments) {
        assessments = assessmentsResponse.data.assessments;
      } else if (Array.isArray(assessmentsResponse.data)) {
        assessments = assessmentsResponse.data;
      }

      if (assessments.length > 0) {
        console.log(`Total assessments found: ${assessments.length}`);

        // Analyze the assessments
        console.log('\nASSESSMENT DETAILS:');
        console.log('-'.repeat(40));

        assessments.forEach((assessment, index) => {
          console.log(`\nAssessment ${index + 1}:`);
          console.log(`  ID: ${assessment.id}`);
          console.log(`  Organization Name: ${assessment.organizationName || 'N/A'}`);
          console.log(`  Project Name: ${assessment.projectName || 'N/A'}`);
          console.log(`  Fund: ${assessment.fund?.name || 'No fund relationship'}`);
          console.log(`  Status: ${assessment.status || 'N/A'}`);
          console.log(`  Score: ${assessment.overallScore || 'N/A'}`);
          console.log(`  Created: ${assessment.createdAt}`);
          console.log(`  Updated: ${assessment.updatedAt}`);

          // Check for Aotearoa
          if (assessment.organizationName && assessment.organizationName.toLowerCase().includes('aotearoa')) {
            console.log('  🎯 FOUND: Aotearoa Agritech Solutions assessment!');
          }

          // Check data structure
          if (!assessment.fund) {
            console.log('  ⚠️ WARNING: Missing fund relationship');
          }
        });

        // Look for recent assessments
        console.log('\n' + '-'.repeat(40));
        console.log('RECENT ASSESSMENTS (last 24 hours):');
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentAssessments = assessments.filter(a =>
          new Date(a.createdAt) > oneDayAgo
        );

        if (recentAssessments.length > 0) {
          console.log(`Found ${recentAssessments.length} recent assessment(s):`);
          recentAssessments.forEach(a => {
            console.log(`  - ${a.organizationName} (Created: ${a.createdAt})`);
          });
        } else {
          console.log('No assessments created in the last 24 hours');
        }

      } else {
        console.log('❌ No assessments found');
        console.log('Response data:', assessmentsResponse.data);
      }

    } else {
      console.log(`❌ API returned status ${assessmentsResponse.status}`);
      console.log('Response:', assessmentsResponse.data);
    }

    // Test 2: Check the /funding/assess page
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: Checking /funding/assess page');
    console.log('='.repeat(80));

    const pageResponse = await makeRequest('/funding/assess');

    if (pageResponse.status === 200) {
      console.log('✅ Page is accessible');

      // Check if it's HTML
      if (typeof pageResponse.data === 'string' && pageResponse.data.includes('<!DOCTYPE html>')) {
        console.log('Page returned HTML content');

        // Look for specific indicators in the HTML
        if (pageResponse.data.includes('__NEXT_DATA__')) {
          console.log('Next.js page data found');

          // Try to extract Next.js data
          const dataMatch = pageResponse.data.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
          if (dataMatch) {
            try {
              const nextData = JSON.parse(dataMatch[1]);
              console.log('Next.js props found:', Object.keys(nextData.props || {}));
            } catch (e) {
              console.log('Could not parse Next.js data');
            }
          }
        }
      }
    } else {
      console.log(`❌ Page returned status ${pageResponse.status}`);
    }

    // Test 3: Test saving a new assessment
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: Creating a test assessment');
    console.log('='.repeat(80));

    const testAssessment = {
      applicationId: `test-${Date.now()}`,
      applicationName: `Debug Test Assessment ${new Date().toISOString()}`,
      fundId: 'seg01', // Using SEG01 as test fund
      status: 'COMPLETED',
      score: 85,
      recommendation: 'APPROVE',
      assessmentDetails: {
        scores: {
          innovation: 90,
          feasibility: 85,
          impact: 80
        },
        comments: 'This is a debug test assessment created to verify the save functionality',
        strengths: ['Test strength 1', 'Test strength 2'],
        weaknesses: ['Test weakness 1']
      }
    };

    console.log('Attempting to save test assessment...');
    console.log('Payload:', JSON.stringify(testAssessment, null, 2));

    const saveResponse = await makeRequest('/api/assessments', 'POST', testAssessment);

    if (saveResponse.status === 200 || saveResponse.status === 201) {
      console.log('✅ Test assessment saved successfully');
      console.log('Response:', JSON.stringify(saveResponse.data, null, 2));

      // Now check if it appears in the GET request
      console.log('\nVerifying test assessment appears in GET /api/assessments...');
      const verifyResponse = await makeRequest('/api/assessments');

      const foundTest = verifyResponse.data.find(a =>
        a.applicationName && a.applicationName.includes('Debug Test Assessment')
      );

      if (foundTest) {
        console.log('✅ Test assessment found in database');
        console.log('Test assessment details:', JSON.stringify(foundTest, null, 2));
      } else {
        console.log('❌ Test assessment NOT found in database after save');
      }
    } else {
      console.log(`❌ Failed to save test assessment. Status: ${saveResponse.status}`);
      console.log('Error response:', saveResponse.data);
    }

    // Test 4: Check for Prisma/Database structure issues
    console.log('\n' + '='.repeat(80));
    console.log('TEST 4: Analyzing Assessment Data Structure');
    console.log('='.repeat(80));

    const assessments = assessmentsResponse.data?.assessments || [];
    if (assessmentsResponse.status === 200 && assessments.length > 0) {
      const sampleAssessment = assessments[0];

      console.log('Sample assessment structure:');
      console.log('Fields present:', Object.keys(sampleAssessment));

      // Check for required fields
      const requiredFields = ['id', 'organizationName', 'fund', 'status', 'createdAt'];
      const missingFields = requiredFields.filter(field => !(field in sampleAssessment));

      if (missingFields.length > 0) {
        console.log('⚠️ Missing required fields:', missingFields);
      } else {
        console.log('✅ All required fields present');
      }

      // Check fund relationship
      if (sampleAssessment.fund) {
        console.log('Fund relationship structure:', Object.keys(sampleAssessment.fund));
      } else {
        console.log('⚠️ Fund relationship is missing or null');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('DEBUGGING SUMMARY');
    console.log('='.repeat(80));

    console.log('\nKEY FINDINGS:');
    if (assessmentsResponse.status === 200) {
      console.log(`✅ API is working (${assessments.length} assessments found)`);

      const hasAotearoa = assessments.some(a =>
        a.organizationName && a.organizationName.toLowerCase().includes('aotearoa')
      );

      if (hasAotearoa) {
        console.log('✅ Aotearoa assessment IS in the database');
      } else {
        console.log('❌ Aotearoa assessment NOT found in database');
      }

      const hasFundRelationships = assessments.every(a => a.fund);
      if (hasFundRelationships) {
        console.log('✅ All assessments have fund relationships');
      } else {
        console.log('⚠️ Some assessments missing fund relationships');
      }
    } else {
      console.log('❌ API endpoint is not working properly');
    }

  } catch (error) {
    console.error('\n❌ Error during debugging:', error);
  }
}

// Run the debugging script
debugProductionAssessments().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('Debugging complete');
  console.log('='.repeat(80));
}).catch(console.error);