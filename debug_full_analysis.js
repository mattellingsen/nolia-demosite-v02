const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFullAnalysis() {
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

    console.log('=== COMPLETE TEMPLATE ANALYSIS ===');
    console.log('Fund: ' + fund.name);

    const analysis = fund.outputTemplatesAnalysis;

    console.log('\nAll available fields:');
    console.log('Keys: ' + Object.keys(analysis).join(', '));

    // Check each field
    for (const [key, value] of Object.entries(analysis)) {
      if (typeof value === 'string') {
        console.log('\n' + key + ' (length: ' + value.length + '):');
        console.log('  Preview: ' + value.substring(0, 100) + '...');

        // Check if this field has the full template
        const hasSections = value.includes('Section 1:') && value.includes('Section 5:') && value.includes('Section 6:');
        console.log('  Has full sections: ' + (hasSections ? 'YES' : 'NO'));
      } else if (Array.isArray(value)) {
        console.log('\n' + key + ' (array length: ' + value.length + '):');
        if (value.length > 0) {
          console.log('  First 5 items: ' + value.slice(0, 5).join(', '));
        }
      } else if (value && typeof value === 'object') {
        console.log('\n' + key + ' (object):');
        console.log('  Keys: ' + Object.keys(value).join(', '));
      } else {
        console.log('\n' + key + ': ' + value);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkFullAnalysis();