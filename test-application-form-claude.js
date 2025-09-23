// Test script to verify Application Form Claude integration
const fs = require('fs');
const path = require('path');

// Simple test content for application form
const testContent = `Application Form for Innovation Grant

Section 1: Applicant Information
1.1 Organization Name: [Required text field]
1.2 Contact Person: [Required text field]
1.3 Email Address: [Required email field]
1.4 Phone Number: [Required phone field]

Section 2: Project Details
2.1 Project Title: [Required text field]
2.2 Project Description: [Required textarea - 500 words max]
2.3 Innovation Category: [Dropdown: Technology, Process, Product, Service]
2.4 Project Duration: [Number field - months]
2.5 Total Budget: [Currency field]

Section 3: Technical Information
3.1 Technical Approach: [Textarea - Required]
3.2 Expected Outcomes: [Textarea - Required]
3.3 Risk Assessment: [Textarea - Optional]

Section 4: Supporting Documents
4.1 Business Plan: [File upload - PDF only]
4.2 Financial Statements: [File upload - required]
4.3 Technical Specifications: [File upload - optional]

Section 5: Declaration
5.1 Applicant Declaration: [Checkbox - required]
5.2 Terms and Conditions: [Checkbox - required]

This application form contains 14 required fields and 3 optional fields.
The form includes text inputs, textareas, dropdowns, number fields, currency fields, file uploads, and checkboxes.
Total estimated completion time: 45-60 minutes.
`;

// Create a temporary file for testing
const testFilePath = path.join(__dirname, 'temp-test-application-form.txt');
fs.writeFileSync(testFilePath, testContent);

console.log('✅ Test file created at:', testFilePath);
console.log('File size:', fs.statSync(testFilePath).size, 'bytes');
console.log('Content preview:', testContent.substring(0, 200) + '...');

// Now we can use this file to test the API endpoint
const FormData = require('form-data');
const axios = require('axios');

async function testApplicationFormAnalysis() {
  try {
    console.log('\n🧪 Testing Application Form Claude Analysis...');

    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath), {
      filename: 'test-application-form.txt',
      contentType: 'text/plain'
    });

    const response = await axios.post('http://localhost:3000/api/analyze/document', form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 120000 // 2 minute timeout
    });

    console.log('✅ API Response received');
    console.log('Status:', response.status);
    console.log('Analysis Mode:', response.data.analysisMode);
    console.log('Questions Found:', response.data.questionsFound);
    console.log('Sections:', response.data.sections.length);
    console.log('Field Types:', response.data.fieldTypes);
    console.log('Complexity:', response.data.complexity);

    if (response.data.analysisMode === 'CLAUDE_AI_REASONING') {
      console.log('🧠 SUCCESS: Claude AI analysis was used!');
      console.log('Form Analysis Purpose:', response.data.formAnalysis?.purpose || 'Not available');
      console.log('Quality Indicators:', JSON.stringify(response.data.qualityIndicators || {}, null, 2));
    } else {
      console.log('🤖 Fallback: Basic pattern matching was used');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('🧹 Test file cleaned up');
  }
}

// Run the test
testApplicationFormAnalysis();