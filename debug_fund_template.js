const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFundTemplateData() {
  try {
    const funds = await prisma.fund.findMany({
      select: {
        id: true,
        name: true,
        outputTemplatesAnalysis: true,
        fundBrain: true
      },
      take: 2
    });

    console.log('=== FUND TEMPLATE ANALYSIS ===');
    for (const fund of funds) {
      console.log('\nFund: ' + fund.name);
      console.log('  Has outputTemplatesAnalysis: ' + (fund.outputTemplatesAnalysis ? 'YES' : 'NO'));

      if (fund.outputTemplatesAnalysis) {
        const analysis = fund.outputTemplatesAnalysis;
        console.log('  Template type: ' + (analysis.templateType || 'undefined'));
        console.log('  Placeholders count: ' + (analysis.placeholders ? analysis.placeholders.length : 0));
        console.log('  Has content: ' + (analysis.content ? 'YES' : 'NO'));
        console.log('  Has originalContent: ' + (analysis.originalContent ? 'YES' : 'NO'));
        console.log('  Has rawTemplateContent: ' + (analysis.rawTemplateContent ? 'YES' : 'NO'));

        if (analysis.content) {
          console.log('  Content preview: ' + analysis.content.substring(0, 200) + '...');
        }

        if (analysis.placeholders && analysis.placeholders.length > 0) {
          console.log('  First 5 placeholders: ' + analysis.placeholders.slice(0, 5).join(', '));
        }
      }

      if (fund.fundBrain && fund.fundBrain.outputTemplate) {
        const template = fund.fundBrain.outputTemplate;
        console.log('  Brain has outputTemplate: YES');
        console.log('  Template structure sections: ' + (template.structure && template.structure.sections ? template.structure.sections.length : 0));
        console.log('  Template sample length: ' + (template.templateSample ? template.templateSample.length : 0));
        console.log('  Original content length: ' + (template.originalContent ? template.originalContent.length : 0));
      } else {
        console.log('  Brain has outputTemplate: NO');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFundTemplateData();