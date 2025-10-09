#!/usr/bin/env node

// Test script to verify tender creation works correctly
// Run with: node test-tender-creation.js

const fs = require('fs');
const path = require('path');

// Create test PDF files
function createTestFile(filename, content) {
    const filePath = path.join(__dirname, filename);
    // Simple PDF header (minimal valid PDF)
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(${content}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000295 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
384
%%EOF`;

    fs.writeFileSync(filePath, pdfContent);
    return filePath;
}

// Create test files
console.log('Creating test PDF files...');
const testFiles = [
    createTestFile('test-pre-rfp.pdf', 'Pre-RFP Business Case Document'),
    createTestFile('test-rfp.pdf', 'Main RFP Document'),
    createTestFile('test-supporting.pdf', 'Supporting Documentation'),
    createTestFile('test-template.pdf', 'Output Template')
];

console.log('Test files created:');
testFiles.forEach(f => console.log(`  - ${f}`));

// Prepare test payload
async function testTenderCreation() {
    console.log('\\n=== Testing Tender Creation API ===\\n');

    // Read files and convert to base64
    const fileToBase64 = (filePath) => {
        const buffer = fs.readFileSync(filePath);
        return buffer.toString('base64');
    };

    const payload = {
        name: `Test Tender ${Date.now()}`,
        description: 'Automated test tender for debugging',
        moduleType: 'PROCUREMENT',
        preRfpFiles: [{
            filename: 'test-pre-rfp.pdf',
            mimeType: 'application/pdf',
            fileSize: fs.statSync(testFiles[0]).size,
            content: fileToBase64(testFiles[0])
        }],
        rfpFiles: [{
            filename: 'test-rfp.pdf',
            mimeType: 'application/pdf',
            fileSize: fs.statSync(testFiles[1]).size,
            content: fileToBase64(testFiles[1])
        }],
        supportingFiles: [{
            filename: 'test-supporting.pdf',
            mimeType: 'application/pdf',
            fileSize: fs.statSync(testFiles[2]).size,
            content: fileToBase64(testFiles[2])
        }],
        outputTemplatesFiles: [{
            filename: 'test-template.pdf',
            mimeType: 'application/pdf',
            fileSize: fs.statSync(testFiles[3]).size,
            content: fileToBase64(testFiles[3])
        }]
    };

    console.log('Payload prepared:');
    console.log(`  - Tender name: ${payload.name}`);
    console.log(`  - Module type: ${payload.moduleType}`);
    console.log(`  - Pre-RFP files: ${payload.preRfpFiles.length}`);
    console.log(`  - RFP files: ${payload.rfpFiles.length}`);
    console.log(`  - Supporting files: ${payload.supportingFiles.length}`);
    console.log(`  - Template files: ${payload.outputTemplatesFiles.length}`);

    try {
        console.log('\\nSending request to API...');
        const response = await fetch('http://localhost:3000/api/tenders/create-async', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`Response status: ${response.status} ${response.statusText}`);

        const result = await response.json();

        if (response.ok) {
            console.log('\\n✅ SUCCESS! Tender created:');
            console.log(`  - Tender ID: ${result.tender?.id}`);
            console.log(`  - Job ID: ${result.jobId}`);
            console.log(`  - Documents uploaded: ${result.documentsUploaded}`);
            console.log(`  - Documents failed: ${result.documentsFailed}`);
            console.log(`  - Message: ${result.message}`);

            if (result.debug) {
                console.log('\\nDebug info:');
                console.log(JSON.stringify(result.debug, null, 2));
            }

            // Test job status endpoint
            if (result.tender?.id) {
                console.log('\\nTesting job-status endpoint...');
                const statusResponse = await fetch(`http://localhost:3000/api/tenders/${result.tender.id}/job-status`);
                const statusResult = await statusResponse.json();

                console.log('Job status response:');
                console.log(`  - Documents uploaded: ${JSON.stringify(statusResult.documentsUploaded)}`);
                console.log(`  - Jobs: ${statusResult.jobs?.length || 0}`);
                console.log(`  - Overall status: ${statusResult.overallStatus}`);
            }

        } else {
            console.log('\\n❌ FAILED to create tender:');
            console.log(JSON.stringify(result, null, 2));
        }

    } catch (error) {
        console.error('\\n❌ Error during test:', error.message);
    }

    // Cleanup test files
    console.log('\\nCleaning up test files...');
    testFiles.forEach(f => {
        try {
            fs.unlinkSync(f);
            console.log(`  - Deleted: ${f}`);
        } catch (e) {
            console.log(`  - Failed to delete: ${f}`);
        }
    });
}

// Run test
testTenderCreation().then(() => {
    console.log('\\n=== Test Complete ===');
}).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});