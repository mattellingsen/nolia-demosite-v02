#!/usr/bin/env node

// Direct test of S3 upload via the API
const fs = require('fs');

async function testS3Upload() {
    console.log('Testing S3 upload directly via API...\n');

    // Create minimal test file
    const testContent = Buffer.from('Test file content ' + Date.now()).toString('base64');

    const payload = {
        name: `Direct S3 Test ${Date.now()}`,
        description: 'Testing S3 upload directly',
        moduleType: 'PROCUREMENT',
        preRfpFiles: [{
            filename: 'test-file.txt',
            mimeType: 'text/plain',
            fileSize: testContent.length,
            content: testContent
        }]
    };

    try {
        const response = await fetch('http://localhost:3000/api/tenders/create-async', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        console.log('Response:', JSON.stringify(result, null, 2));

        if (result.debug?.uploads?.[0]?.error) {
            console.log('\nERROR DETAILS:', result.debug.uploads[0].error);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testS3Upload();