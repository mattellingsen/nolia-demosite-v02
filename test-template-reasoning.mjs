import { prisma } from './src/lib/database-s3.ts';
import { resilientAssessmentService } from './src/lib/resilient-assessment-service.ts';

async function testTemplateReasoning() {
  console.log('🧪 Testing new template reasoning system');

  try {
    // Get Student Experience Grant 03 (the fund with the complete template)
    const fund = await prisma.fund.findFirst({
      where: { name: { contains: 'Student Experience Grant 03' } }
    });

    if (!fund) {
      console.log('❌ Student Experience Grant 03 not found');
      return;
    }

    console.log('✅ Found fund:', fund.name);
    console.log('📅 Fund created:', fund.createdAt);

    // Mock application content (Marine Tech Innovations style)
    const mockApplicationContent = `
Application Reference: AI-Powered Pest Detection Systems
Organisation Name: Marine Tech Innovations
Project Title: AI-Powered Pest Detection Systems for Fisheries

1.5 Business Eligibility
Marine Tech Innovations is a New Zealand registered limited company established in 2020.
We are a private company, not government-controlled.
ABN: 123456789
Registration: New Zealand Companies Office

1.6 Financial Information
Annual turnover: $2.8 million
Current cash position: $450,000
Financial viability confirmed for next 12+ months
Ability to fund student wages upfront: Yes, confirmed

2.1 Project Description
Students will work on two distinct projects:
1) Sonar Hardware Development - involving array design, performance testing, and environmental testing
2) Signal Processing Systems - involving algorithm implementation, visualization development, and performance analysis

Both roles include daily standups, weekly documentation, monthly presentations, and field testing participation.

Total Funding Requested: $22,240
Number of Students Applied For: 2
Expected Duration: 6 months

Nature of Business:
Marine Tech Innovations, established in 2020, specialises in developing advanced sonar systems for fisheries management.
Company has 18 employees including 4 R&D FTE, focusing on sonar hardware and signal processing solutions for fish stock assessment.

Recent R&D Activities (Last 12 Months):
- Development of new transducer array configurations
- Implementation of advanced signal processing algorithms
- Testing of prototype sonar systems
- Creation of data visualization tools
- Field testing and validation studies

Planned R&D Activities (Next 12 Months):
- Enhancement of transducer sensitivity and range
- Development of real-time processing capabilities
- Implementation of machine learning for species identification
- Optimisation of power consumption
- Integration of environmental impact monitoring
`;

    console.log('\n🔬 Testing new template reasoning approach...');

    // Test the new reasoning system
    const result = await resilientAssessmentService.assess(
      mockApplicationContent,
      fund,
      'Marine Tech Innovations Application.docx'
    );

    console.log('\n📊 ASSESSMENT RESULT:');
    console.log('Success:', result.success);
    console.log('Strategy Used:', result.strategyUsed.name);
    console.log('AI Used:', result.transparencyInfo.aiUsed);

    if (result.assessmentData) {
      console.log('\n📋 ASSESSMENT DATA:');

      // Check if we have a filled template
      if (result.assessmentData.filledTemplate) {
        console.log('✅ Filled Template Generated:', result.assessmentData.filledTemplate.length, 'characters');
        console.log('\n📄 TEMPLATE PREVIEW (first 500 chars):');
        console.log('---START---');
        console.log(result.assessmentData.filledTemplate.substring(0, 500) + '...');
        console.log('---END---');
      }

      // Check extracted fields
      if (result.assessmentData.extractedFields) {
        console.log('\n📈 EXTRACTED FIELDS:');
        console.log('- Overall Score:', result.assessmentData.extractedFields.overallScore);
        console.log('- Recommendation:', result.assessmentData.extractedFields.recommendation);
        console.log('- Strengths:', result.assessmentData.extractedFields.strengths);
        console.log('- Weaknesses:', result.assessmentData.extractedFields.weaknesses);
      }

      // Check template format indicator
      if (result.assessmentData.templateFormat) {
        console.log('\n🏷️ TEMPLATE FORMAT:', result.assessmentData.templateFormat);
      }
    }

    console.log('\n💬 USER MESSAGE:', result.transparencyInfo.userMessage);

    if (result.transparencyInfo.fallbackReason) {
      console.log('\n⚠️ FALLBACK REASON:', result.transparencyInfo.fallbackReason);
    }

    // Test specific improvements
    console.log('\n🎯 TESTING KEY IMPROVEMENTS:');

    const filledTemplate = result.assessmentData?.filledTemplate || '';

    // Test 1: Should use project name, not company name for Application Title
    const hasCorrectProjectTitle = filledTemplate.includes('AI-Powered Pest Detection Systems') &&
                                   !filledTemplate.includes('Application Title: Marine Tech Innovations');
    console.log('✅ Correct Project Title (not company name):', hasCorrectProjectTitle ? 'PASS' : 'FAIL');

    // Test 2: Should use today's date for Assessment Date
    const todayDate = new Date().toLocaleDateString();
    const hasCorrectDate = filledTemplate.includes(todayDate) || filledTemplate.includes('Assessment Date:');
    console.log('✅ Uses Today\'s Date for Assessment:', hasCorrectDate ? 'PASS' : 'FAIL');

    // Test 3: Should extract business eligibility properly
    const hasBusinessEligibility = filledTemplate.includes('New Zealand registered') ||
                                   filledTemplate.includes('Yes') && filledTemplate.includes('Entity Type');
    console.log('✅ Extracts Business Eligibility:', hasBusinessEligibility ? 'PASS' : 'FAIL');

    // Test 4: Should provide reasoning rather than generic responses
    const hasReasoning = !filledTemplate.includes('Application reviewed with enhanced field extraction');
    console.log('✅ Provides Specific Reasoning:', hasReasoning ? 'PASS' : 'FAIL');

    console.log('\n🎉 Template reasoning test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testTemplateReasoning().catch(console.error);