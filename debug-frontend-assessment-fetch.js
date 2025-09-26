#!/usr/bin/env node

/**
 * Frontend Assessment Fetch Debugging
 * Tests exactly what the frontend React hook receives vs what the API provides
 */

const https = require('https');

const PRODUCTION_URL = 'main.d2l8hlr3sei3te.amplifyapp.com';

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
        'User-Agent': 'Mozilla/5.0 (compatible; DebugBot/1.0)'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.end();
  });
}

async function debugFrontendFetch() {
  console.log('='.repeat(80));
  console.log('FRONTEND ASSESSMENT FETCH DEBUGGING');
  console.log('='.repeat(80));
  console.log(`Production URL: https://${PRODUCTION_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Test 1: Exact frontend API call
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: Simulating Frontend useAssessments Hook Call');
    console.log('='.repeat(80));

    const frontendParams = new URLSearchParams({
      limit: '50',
      offset: '0'
    });

    const frontendApiCall = `/api/assessments?${frontendParams.toString()}`;
    console.log(`API call: ${frontendApiCall}`);

    const response = await makeRequest(frontendApiCall);

    console.log(`Response Status: ${response.status}`);
    console.log(`Cache Headers:`, {
      'x-cache': response.headers['x-cache'],
      'age': response.headers['age'],
      'cache-control': response.headers['cache-control']
    });

    if (response.status === 200) {
      console.log('\n✅ API call successful');

      const data = response.data;
      console.log('\n📊 RESPONSE ANALYSIS:');
      console.log(`  success: ${data.success}`);
      console.log(`  assessments count: ${data.assessments?.length || 0}`);
      console.log(`  pagination total: ${data.pagination?.total || 0}`);

      if (data.assessments && data.assessments.length > 0) {
        console.log('\n📋 ASSESSMENTS FOUND:');
        data.assessments.forEach((assessment, index) => {
          console.log(`\n  Assessment ${index + 1}:`);
          console.log(`    ID: ${assessment.id}`);
          console.log(`    Organization: ${assessment.organizationName}`);
          console.log(`    Fund: ${assessment.fund?.name || 'NO FUND'}`);
          console.log(`    Status: ${assessment.status}`);
          console.log(`    Score: ${assessment.overallScore}`);
          console.log(`    Created: ${assessment.createdAt}`);

          // Check if this is the Aotearoa assessment
          if (assessment.organizationName && assessment.organizationName.toLowerCase().includes('aotearoa')) {
            console.log(`    🎯 THIS IS THE AOTEAROA ASSESSMENT!`);
          }
        });

        console.log('\n🔍 FRONTEND TRANSFORMATION TEST:');
        // Simulate the frontend transformation logic
        const transformedAssessments = data.assessments.map((assessment) => {
          const logoUrl = assessment.assessmentType === 'AI_POWERED'
            ? "/images/funding/file-type-icon-pdf.png"
            : "/images/funding/file-type-icon-doc.png";

          const organizationName = assessment.organizationName;
          const projectName = assessment.projectName || organizationName;

          return {
            id: assessment.id,
            vendor: {
              name: organizationName,
              website: projectName,
              logoUrl: logoUrl,
            },
            rating: Math.round(assessment.overallScore || 0),
            change: "N/A",
            changeTrend: "neutral",
            lastAssessed: new Date(assessment.createdAt).getTime(),
            categories: [assessment.fund.name],
            fundName: assessment.fund.name,
            assessmentType: assessment.assessmentType,
          };
        });

        console.log(`    Transformed ${transformedAssessments.length} assessments`);

        const aotearoaTransformed = transformedAssessments.find(a =>
          a.vendor.name && a.vendor.name.toLowerCase().includes('aotearoa')
        );

        if (aotearoaTransformed) {
          console.log('    ✅ Aotearoa assessment transformed successfully:');
          console.log('       Organization:', aotearoaTransformed.vendor.name);
          console.log('       Project:', aotearoaTransformed.vendor.website);
          console.log('       Fund:', aotearoaTransformed.fundName);
          console.log('       Rating:', aotearoaTransformed.rating);
        } else {
          console.log('    ❌ Aotearoa assessment NOT found in transformed data');
        }

      } else {
        console.log('\n❌ No assessments in response');
      }

    } else {
      console.log(`❌ API call failed with status ${response.status}`);
      console.log('Response:', response.data);
    }

    // Test 2: Check React Query cache behavior
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: Cache Invalidation Check');
    console.log('='.repeat(80));

    // Make the same call again to see if we get cached data
    const cachedResponse = await makeRequest(frontendApiCall);

    if (cachedResponse.headers['x-cache']) {
      console.log(`Cache status: ${cachedResponse.headers['x-cache']}`);
      console.log(`Cache age: ${cachedResponse.headers['age'] || 'N/A'} seconds`);
    }

    const sameData = JSON.stringify(response.data) === JSON.stringify(cachedResponse.data);
    console.log(`Same data returned: ${sameData ? '✅ Yes' : '❌ No'}`);

    // Test 3: Check specific display logic
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: Frontend Display Logic Test');
    console.log('='.repeat(80));

    if (response.status === 200 && response.data.assessments) {
      const assessments = response.data.assessments;
      const assessmentsResponse = response.data;

      // Simulate the exact frontend logic
      const mounted = true;
      const assessmentsLoading = false;
      const assessmentsError = null;

      console.log('Frontend state simulation:');
      console.log(`  mounted: ${mounted}`);
      console.log(`  assessmentsLoading: ${assessmentsLoading}`);
      console.log(`  assessmentsError: ${assessmentsError}`);
      console.log(`  assessments.length: ${assessments.length}`);

      // Check display conditions
      const transformedAssessments = assessments.map(a => ({ id: a.id, organizationName: a.organizationName }));

      const shouldShowTable = mounted && !assessmentsLoading && transformedAssessments && transformedAssessments.length > 0;
      const shouldShowLoading = assessmentsLoading;
      const shouldShowError = assessmentsError;
      const shouldShowEmpty = transformedAssessments.length === 0;

      console.log('\nDisplay conditions:');
      console.log(`  Should show table: ${shouldShowTable ? '✅ Yes' : '❌ No'}`);
      console.log(`  Should show loading: ${shouldShowLoading ? '✅ Yes' : '❌ No'}`);
      console.log(`  Should show error: ${shouldShowError ? '✅ Yes' : '❌ No'}`);
      console.log(`  Should show empty: ${shouldShowEmpty ? '✅ Yes' : '❌ No'}`);

      if (shouldShowTable) {
        console.log('\n🎯 TABLE SHOULD BE VISIBLE with the following assessments:');
        transformedAssessments.forEach((assessment, index) => {
          console.log(`    ${index + 1}. ${assessment.organizationName}`);
        });
      }
    }

    // Test 4: Direct frontend simulation
    console.log('\n' + '='.repeat(80));
    console.log('TEST 4: Full Frontend Simulation');
    console.log('='.repeat(80));

    if (response.status === 200 && response.data.success) {
      const data = response.data;

      // Exact frontend useMemo logic
      const assessments = data.assessments || [];
      const transformedAssessments = assessments.map((assessment) => {
        const logoUrl = assessment.assessmentType === 'AI_POWERED'
          ? "/images/funding/file-type-icon-pdf.png"
          : "/images/funding/file-type-icon-doc.png";

        const organizationName = assessment.organizationName;
        const projectName = assessment.projectName || organizationName;

        return {
          id: assessment.id,
          vendor: {
            name: organizationName,
            website: projectName,
            logoUrl: logoUrl,
          },
          rating: Math.round(assessment.overallScore || 0),
          change: "N/A",
          changeTrend: "neutral",
          lastAssessed: new Date(assessment.createdAt).getTime(),
          categories: [assessment.fund.name],
          fundName: assessment.fund.name,
          assessmentType: assessment.assessmentType,
        };
      });

      // Sorting logic (no sort descriptor)
      const sortedItems = transformedAssessments.length > 0 ? transformedAssessments : [];

      console.log('📊 FINAL FRONTEND STATE:');
      console.log(`  Raw assessments: ${assessments.length}`);
      console.log(`  Transformed assessments: ${transformedAssessments.length}`);
      console.log(`  Sorted items: ${sortedItems.length}`);

      if (sortedItems.length > 0) {
        console.log('\n✅ ASSESSMENTS READY FOR DISPLAY:');
        sortedItems.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.vendor.name} (${item.fundName}) - Score: ${item.rating}`);

          if (item.vendor.name && item.vendor.name.toLowerCase().includes('aotearoa')) {
            console.log(`      🎯 AOTEAROA FOUND IN FINAL DISPLAY LIST!`);
          }
        });
      } else {
        console.log('❌ No items in final sorted list');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('DEBUGGING SUMMARY');
    console.log('='.repeat(80));

    if (response.status === 200 && response.data.success) {
      const assessments = response.data.assessments || [];
      const hasAotearoa = assessments.some(a =>
        a.organizationName && a.organizationName.toLowerCase().includes('aotearoa')
      );

      console.log('\n🔍 KEY FINDINGS:');
      console.log(`✅ API endpoint working (status: ${response.status})`);
      console.log(`✅ API returns ${assessments.length} assessments`);
      console.log(`${hasAotearoa ? '✅' : '❌'} Aotearoa assessment ${hasAotearoa ? 'IS' : 'NOT'} in API response`);

      if (hasAotearoa) {
        console.log('✅ Assessment should be visible in frontend');
        console.log('\n🚨 POTENTIAL ISSUES:');
        console.log('   1. Client-side rendering not completing');
        console.log('   2. React Query cache not updating');
        console.log('   3. Frontend state management issue');
        console.log('   4. CSS/display styling hiding the content');
        console.log('   5. JavaScript errors preventing render');
      } else {
        console.log('❌ Assessment missing from API response');
      }

      // Cache analysis
      if (response.headers['x-cache']) {
        console.log(`\n📦 Cache status: ${response.headers['x-cache']}`);
        if (response.headers['x-cache'].includes('Hit')) {
          console.log('⚠️  Response is cached - may need cache invalidation');
        }
      }

    } else {
      console.log('\n❌ API endpoint failure');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('\n❌ Error during frontend debugging:', error);
  }
}

// Run the debugging
debugFrontendFetch().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('Frontend debugging complete');
  console.log('='.repeat(80));
}).catch(console.error);