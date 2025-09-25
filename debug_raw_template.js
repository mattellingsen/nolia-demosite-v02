const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRawTemplateContent() {
  try {
    const fund = await prisma.fund.findFirst({
      where: { name: 'Student Experience Grant 02' },
      select: {
        id: true,
        name: true,
        outputTemplatesAnalysis: true
      }
    });

    if (!fund || !fund.outputTemplatesAnalysis) {
      console.log('No fund or template analysis found');
      return;
    }

    console.log('=== RAW TEMPLATE CONTENT ANALYSIS ===');
    console.log('Fund: ' + fund.name);

    const analysis = fund.outputTemplatesAnalysis;

    if (analysis.rawTemplateContent) {
      console.log('\n=== RAW TEMPLATE CONTENT ===');
      console.log('Length: ' + analysis.rawTemplateContent.length);
      console.log('Preview (first 500 chars):');
      console.log(analysis.rawTemplateContent.substring(0, 500));
      console.log('\n=== END PREVIEW ===');

      // Check if it matches expected template structure
      const hasApplicationDetails = analysis.rawTemplateContent.includes('Application Details');
      const hasSection1 = analysis.rawTemplateContent.includes('Section 1: FES Assessment');
      const hasSection5 = analysis.rawTemplateContent.includes('Section 5: Assessment Summary');
      const hasSection6 = analysis.rawTemplateContent.includes('Section 6: Recommendation');

      console.log('\nStructure Check:');
      console.log('  Has Application Details: ' + (hasApplicationDetails ? 'YES' : 'NO'));
      console.log('  Has Section 1: ' + (hasSection1 ? 'YES' : 'NO'));
      console.log('  Has Section 5: ' + (hasSection5 ? 'YES' : 'NO'));
      console.log('  Has Section 6: ' + (hasSection6 ? 'YES' : 'NO'));

      // Count placeholders in content
      const placeholderMatches = analysis.rawTemplateContent.match(/\[[^\]]+\]/g);
      const placeholderCount = placeholderMatches ? placeholderMatches.length : 0;

      console.log('  Placeholders in content: ' + placeholderCount);
      console.log('  Placeholders in array: ' + (analysis.placeholders ? analysis.placeholders.length : 0));

      if (placeholderMatches && placeholderMatches.length > 0) {
        console.log('  First 10 placeholders found: ' + placeholderMatches.slice(0, 10).join(', '));
      }
    } else {
      console.log('No rawTemplateContent found');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkRawTemplateContent();