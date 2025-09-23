// Test the actual template formatter with the real assessment API
const fs = require('fs');

async function testRealAssessment() {
  console.log('🧪 Testing REAL template formatter via API...');

  try {
    // Create a test application file
    const testApplication = `Application for Student Experience Grant

Organisation Details:
Company Name: TechFlow Solutions Ltd
Contact Email: info@techflow.co.nz
Business Type: Limited Company

Project Information:
We are developing an innovative IoT platform for smart agriculture monitoring. Our R&D activities focus on sensor networks and machine learning algorithms for crop optimization.

Recent R&D (Last 12 months):
- Developed prototype environmental sensors
- Created initial ML models for weather prediction
- Tested field monitoring systems with local farms

Planned R&D (Next 12 months):
- Scale sensor deployment across multiple farms
- Enhance predictive algorithms
- Develop mobile application interface

Student Requirements:
Number of Students: 2
Total Funding Requested: $22,240
Project Duration: 12 months

Student Exposure:
Students will work directly with our engineering team on IoT development, machine learning implementation, and field testing of agricultural monitoring systems.

Professional Development:
Mentorship from senior engineers, technical training sessions, exposure to full product development lifecycle from prototype to deployment.

Business Benefit:
Students will accelerate our AI capabilities and provide fresh perspectives on agricultural technology solutions.`;

    // Write test file
    fs.writeFileSync('test-techflow-application.txt', testApplication);
    console.log('✅ Test application created: test-techflow-application.txt');

    // Use the actual assessment API
    const formData = new FormData();
    const fileBlob = new Blob([testApplication], { type: 'text/plain' });
    formData.append('file', fileBlob, 'test-techflow-application.txt');
    formData.append('fundId', '40dbc535-6b54-4c7d-8fc5-9b1ffb1e5405'); // Student Experience Grant 15

    console.log('📤 Sending to actual assessment API...');

    const response = await fetch('http://localhost:3000/api/analyze/test-assessment', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Assessment completed successfully!');

    // Save the full result
    fs.writeFileSync('real_assessment_result.json', JSON.stringify(result, null, 2));
    console.log('💾 Full result saved to real_assessment_result.json');

    // Check the key template fields
    if (result.success && result.assessment && result.assessment.filledTemplate) {
      const template = result.assessment.filledTemplate;

      console.log('\n📋 KEY TEMPLATE FIELDS CHECK:');
      console.log('=====================================');

      // Extract key lines for verification
      const lines = template.split('\n');
      lines.forEach((line, i) => {
        if (line.toLowerCase().includes('organisation name:') ||
            line.toLowerCase().includes('application reference:') ||
            line.toLowerCase().includes('assessment date:') ||
            line.toLowerCase().includes('entity type confirmed:') ||
            line.toLowerCase().includes('financially viable')) {
          console.log(`Line ${i+1}: ${line.trim()}`);
        }
      });

      console.log('\n🔍 LOOKING FOR ISSUES:');
      console.log('=====================================');

      // Check for the old problems
      if (template.includes('Application Reference: TechFlow Solutions Ltd')) {
        console.log('❌ ISSUE: Application Reference shows company name instead of reference number');
      } else {
        console.log('✅ Application Reference field looks correct');
      }

      if (template.includes('Assessment Date: TechFlow Solutions Ltd')) {
        console.log('❌ ISSUE: Assessment Date shows company name instead of date');
      } else {
        console.log('✅ Assessment Date field looks correct');
      }

      if (template.includes('[Yes/No]')) {
        console.log('❌ ISSUE: Yes/No placeholders not replaced');
      } else {
        console.log('✅ Yes/No placeholders appear to be replaced');
      }

    } else {
      console.log('❌ No formatted output found in result');
    }

    // Clean up
    fs.unlinkSync('test-techflow-application.txt');
    console.log('🧹 Test file cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    // Clean up on error
    if (fs.existsSync('test-techflow-application.txt')) {
      fs.unlinkSync('test-techflow-application.txt');
    }
  }
}

// Run the test
testRealAssessment();