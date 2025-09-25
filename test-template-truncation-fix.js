const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTemplateTruncationFix() {
  try {
    console.log('🔧 Testing Template Truncation Fix...\n');

    // Get the affected funds
    const funds = await prisma.fund.findMany({
      where: {
        name: { contains: 'Student Experience Grant' }
      },
      select: {
        id: true,
        name: true,
        outputTemplatesAnalysis: true
      }
    });

    if (funds.length === 0) {
      console.log('❌ No SEG funds found');
      return;
    }

    console.log(`📋 Found ${funds.length} SEG fund(s) to test\n`);

    for (const fund of funds) {
      console.log(`=== ${fund.name} ===`);

      // Check current state
      if (fund.outputTemplatesAnalysis && fund.outputTemplatesAnalysis.rawTemplateContent) {
        const currentLength = fund.outputTemplatesAnalysis.rawTemplateContent.length;
        console.log(`📏 Current template content length: ${currentLength} characters`);

        const content = fund.outputTemplatesAnalysis.rawTemplateContent;

        // Check for truncation indicators
        const isTruncated = currentLength === 204 || !content.includes('Section 6: Recommendation');

        if (isTruncated) {
          console.log('❌ Template is TRUNCATED');
          console.log('🔍 Content preview (first 200 chars):');
          console.log(content.substring(0, 200) + '...');
        } else {
          console.log('✅ Template appears to have full content');
        }

        // Check for key sections that should be present in full SEG template
        const sections = [
          'Application Details',
          'Section 1: FES Assessment',
          'Section 2: Project Details',
          'Section 3: Organisation Information',
          'Section 4: Project Environment',
          'Section 5: Assessment Summary',
          'Section 6: Recommendation'
        ];

        console.log('\n📋 Section check:');
        sections.forEach(section => {
          const found = content.includes(section);
          console.log(`  ${found ? '✅' : '❌'} ${section}`);
        });

        // Count placeholders
        const placeholderMatches = content.match(/\[[^\]]+\]/g);
        const placeholderCount = placeholderMatches ? placeholderMatches.length : 0;
        console.log(`\n🔖 Placeholders found: ${placeholderCount}`);

        // Check analysis metadata
        const analysis = fund.outputTemplatesAnalysis;
        console.log(`\n📊 Analysis metadata:`);
        console.log(`  Status: ${analysis.status}`);
        console.log(`  Filename: ${analysis.filename}`);
        console.log(`  Use Raw Template: ${analysis.useRawTemplate}`);
        console.log(`  Placeholders array length: ${analysis.placeholders ? analysis.placeholders.length : 0}`);

      } else {
        console.log('❌ No template content found');
      }

      console.log('\n' + '='.repeat(50) + '\n');
    }

    console.log('🔧 APPLIED FIX SUMMARY:');
    console.log('1. ✅ Modified analyzeOutputTemplateDocument to store original content directly');
    console.log('2. ✅ Removed full content from Claude JSON response (prevents truncation)');
    console.log('3. ✅ Added fallback placeholder extraction using regex');
    console.log('4. ✅ Reduced maxTokens from 8000 to 2000 (more efficient)');
    console.log('5. ✅ Added proper error handling with content preservation');

    console.log('\n🚀 NEXT STEPS TO FULLY RESOLVE:');
    console.log('1. Re-upload the SEG-Output-Template.docx files to trigger re-analysis');
    console.log('2. OR manually trigger document re-processing for affected funds');
    console.log('3. Verify the full 6-section template content is preserved');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testTemplateTruncationFix();