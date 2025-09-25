const { prisma } = require('./src/lib/database-s3');

async function checkSEG02Template() {
  try {
    const fund = await prisma.fund.findFirst({
      where: { name: { contains: 'Student Experience Grant 03' } }
    });

    if (fund) {
      console.log('🔍 Fund found:', fund.name);
      console.log('📅 Created:', fund.createdAt);
      console.log('📊 Status:', fund.status);

      if (fund.outputTemplatesAnalysis) {
        const analysis = fund.outputTemplatesAnalysis;
        console.log('\n📋 OUTPUT TEMPLATE ANALYSIS:');
        console.log('Template content length:', analysis.rawTemplateContent ? analysis.rawTemplateContent.length : 'No content');
        console.log('Placeholder count:', analysis.placeholderCount || 'Not set');

        console.log('\n📝 First 500 chars of template:');
        console.log('---START---');
        console.log(analysis.rawTemplateContent ? analysis.rawTemplateContent.substring(0, 500) + '...' : 'No template content');
        console.log('---END---');

        // Check for key sections
        const content = analysis.rawTemplateContent || '';
        console.log('\n🔍 SECTION ANALYSIS:');
        console.log('✅ Has Section 1 (FES Assessment):', content.includes('Section 1: FES Assessment'));
        console.log('✅ Has Section 2 (Three Key Criteria):', content.includes('Section 2: FES Assessment - Three Key Criteria'));
        console.log('✅ Has Section 3 (SGS Assessment):', content.includes('Section 3: SGS Assessment'));
        console.log('✅ Has Section 4 (Compliance Review):', content.includes('Section 4: Compliance Review'));
        console.log('✅ Has Section 5 (Assessment Summary):', content.includes('Section 5: Assessment Summary'));
        console.log('✅ Has Section 6 (Recommendation):', content.includes('Section 6: Recommendation'));

        // Count actual sections found
        const sections = [
          content.includes('Section 1'),
          content.includes('Section 2'),
          content.includes('Section 3'),
          content.includes('Section 4'),
          content.includes('Section 5'),
          content.includes('Section 6')
        ];
        const sectionsFound = sections.filter(Boolean).length;
        console.log(`\n📊 TOTAL SECTIONS FOUND: ${sectionsFound}/6`);

        if (sectionsFound === 6) {
          console.log('✅ TEMPLATE IS COMPLETE - All 6 sections present!');
        } else {
          console.log('❌ TEMPLATE IS INCOMPLETE - Missing sections');
        }

      } else {
        console.log('❌ No output templates analysis found');
      }
    } else {
      console.log('❌ Student Experience Grant 02 not found');

      // List all funds with "Student Experience Grant" in name
      const allFunds = await prisma.fund.findMany({
        where: { name: { contains: 'Student Experience Grant' } },
        select: { name: true, createdAt: true, status: true }
      });

      console.log('\n📋 All Student Experience Grant funds:');
      allFunds.forEach(f => {
        console.log(`- ${f.name} (${f.status}) - Created: ${f.createdAt}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSEG02Template().catch(console.error);