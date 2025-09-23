const fs = require('fs');
const FormData = require('form-data');
const { default: fetch } = require('node-fetch');

async function testSimpleRAG() {
    console.log('🔍 Testing Simple RAG Approach (Claude Projects Style)...');

    // Simple business application that should map well to the template
    const businessApplicationContent = `
Student Experience Grant Application

Organization: Clean Energy Systems NZ
Application Reference: SEG-2024-001
Number of Students Applied For: 2 students
Total Funding Requested: $22,240 (GST exclusive) [2 students × $11,120]

Nature of Business:
Clean Energy Systems NZ, established in 2019, specialises in developing innovative wind energy solutions for urban environments. With 22 employees, including 5 R&D FTE, we maintain an active R&D program focused on creating efficient, low-noise wind turbines specifically designed for city installation.

Recent R&D Activities (Last 12 Months):
- Completed prototype testing of our third-generation urban wind turbine
- Developed proprietary noise reduction technology reducing sound output by 40%
- Filed two patents for innovative blade design and control systems
- Conducted extensive field testing across 15 urban locations

Planned R&D Activities (Next 12 Months):
- Scale up production capabilities for commercial deployment
- Develop smart grid integration software for optimal energy distribution
- Research advanced materials for increased turbine efficiency

Student Exposure to Technical Work:
Students will be directly involved in hands-on R&D projects including testing and calibrating wind measurement equipment, assisting with aerodynamic modeling using CFD software, and contributing to field data collection and analysis.
`;

    // Write to temp file
    const tempFile = '/tmp/test-simple-rag.txt';
    fs.writeFileSync(tempFile, businessApplicationContent);

    // Create FormData
    const formData = new FormData();
    formData.append('application', fs.createReadStream(tempFile), {
        filename: 'test-simple-rag.txt',
        contentType: 'text/plain'
    });
    formData.append('fundId', '40dbc535-6b54-4c7d-8fc5-9b1ffb1e5405'); // Student Experience Grant 15

    try {
        console.log('📤 Sending to V2 API with RAG approach...');
        const response = await fetch('http://localhost:3001/api/process/test-assessment-v2', {
            method: 'POST',
            body: formData,
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            return;
        }

        const result = await response.json();

        console.log('✅ RAG Assessment Success!');
        console.log('🏢 Looking for organization name in template output...');

        const templateOutput = result.assessment?.formattedOutput || '';
        console.log('Template length:', templateOutput.length);

        // Check key mappings
        if (templateOutput.includes('Clean Energy Systems NZ')) {
            console.log('✅ Organization name properly extracted and mapped!');
        } else {
            console.log('❌ Organization name not found in template');
        }

        if (templateOutput.includes('2') && templateOutput.includes('student')) {
            console.log('✅ Number of students properly extracted!');
        } else {
            console.log('❌ Number of students not properly mapped');
        }

        if (templateOutput.includes('wind energy') || templateOutput.includes('turbine')) {
            console.log('✅ Business description properly extracted!');
        } else {
            console.log('❌ Business description not properly mapped');
        }

        // Show sample of the template output
        console.log('\n📋 Template Output Sample (first 500 chars):');
        console.log(templateOutput.substring(0, 500) + '...');

        console.log('\n📊 Assessment Score:', result.score || 'Not provided');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        // Clean up
        try {
            fs.unlinkSync(tempFile);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

testSimpleRAG().catch(console.error);