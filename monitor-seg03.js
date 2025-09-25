const { prisma } = require('./src/lib/database-s3');

async function monitorSEG03() {
  try {
    const fund = await prisma.fund.findFirst({
      where: { name: { contains: 'Student Experience Grant 03' } },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        outputTemplatesAnalysis: true,
        selectionCriteriaAnalysis: true,
        goodExamplesAnalysis: true
      }
    });

    if (fund) {
      console.log('✅ Student Experience Grant 03 Status:');
      console.log('- Name:', fund.name);
      console.log('- Status:', fund.status);
      console.log('- Created:', fund.createdAt);
      console.log('');

      // Check output template
      if (fund.outputTemplatesAnalysis) {
        const analysis = fund.outputTemplatesAnalysis;
        console.log('📄 OUTPUT TEMPLATE:');
        console.log('- Content length:', analysis.rawTemplateContent ? analysis.rawTemplateContent.length : 'No content');
        console.log('- Placeholder count:', analysis.placeholderCount || 'Not set');

        if (analysis.rawTemplateContent) {
          const content = analysis.rawTemplateContent;
          const sections = [
            content.includes('Section 1'),
            content.includes('Section 2'),
            content.includes('Section 3'),
            content.includes('Section 4'),
            content.includes('Section 5'),
            content.includes('Section 6')
          ];
          const sectionsFound = sections.filter(Boolean).length;
          console.log(`- Sections found: ${sectionsFound}/6`);
          console.log(sectionsFound === 6 ? '✅ COMPLETE TEMPLATE!' : '❌ TRUNCATED TEMPLATE');
        }
        console.log('');
      } else {
        console.log('📄 OUTPUT TEMPLATE: Not processed yet');
        console.log('');
      }

      // Check selection criteria
      if (fund.selectionCriteriaAnalysis) {
        console.log('📋 SELECTION CRITERIA: ✅ Processed');
      } else {
        console.log('📋 SELECTION CRITERIA: ⏳ Not processed yet');
      }

      // Check good examples
      if (fund.goodExamplesAnalysis) {
        console.log('💡 GOOD EXAMPLES: ✅ Processed');
      } else {
        console.log('💡 GOOD EXAMPLES: ⏳ Not processed yet');
      }

    } else {
      console.log('❌ Student Experience Grant 03 not found yet');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

monitorSEG03().catch(console.error);