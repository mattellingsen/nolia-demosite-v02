const { prisma } = require('./src/lib/database-s3.ts');

async function checkFunds() {
  const funds = await prisma.fund.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      applicationFormAnalysis: true,
      selectionCriteriaAnalysis: true,
      goodExamplesAnalysis: true,
      outputTemplatesAnalysis: true,
      fundBrain: true
    }
  });

  console.log('\nCurrent funds in production database:\n');
  console.log('=====================================\n');

  funds.forEach(fund => {
    const analysisComplete = !!(
      fund.applicationFormAnalysis &&
      fund.selectionCriteriaAnalysis &&
      fund.goodExamplesAnalysis &&
      fund.outputTemplatesAnalysis &&
      fund.fundBrain
    );

    console.log(`• ${fund.name}`);
    console.log(`  ID: ${fund.id}`);
    console.log(`  Status: ${fund.status}`);
    console.log(`  Created: ${fund.createdAt.toISOString()}`);
    console.log(`  Analysis Complete: ${analysisComplete ? 'Yes ✅' : 'No ❌'}`);
    if (!analysisComplete) {
      console.log(`  Missing:`);
      if (!fund.applicationFormAnalysis) console.log(`    - Application Form Analysis`);
      if (!fund.selectionCriteriaAnalysis) console.log(`    - Selection Criteria Analysis`);
      if (!fund.goodExamplesAnalysis) console.log(`    - Good Examples Analysis`);
      if (!fund.outputTemplatesAnalysis) console.log(`    - Output Templates Analysis`);
      if (!fund.fundBrain) console.log(`    - Fund Brain Assembly`);
    }
    console.log();
  });

  console.log('=====================================\n');

  await prisma.$disconnect();
}

checkFunds().catch(console.error);