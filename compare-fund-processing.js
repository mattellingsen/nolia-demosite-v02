const { prisma } = require('./src/lib/database-s3.ts');

async function compareFundProcessing() {
  console.log('===========================================');
  console.log('COMPARING SUCCESSFUL vs FAILED FUND PROCESSING');
  console.log('===========================================\n');

  // Define the funds to analyze
  const fundsToAnalyze = [
    { id: '7bce05d0-78db-4cf5-b7dd-c63ed9f3a745', name: 'Grant 03 (SUCCESS)' },
    { id: 'caa93969-d44e-4c38-9a2a-ae1791ec1ef9', name: 'Grant 05 (FAILED)' },
    { id: '8b487a09-befa-4083-9fe3-335af5e53a4b', name: 'Grant 06 (PARTIAL)' },
    { id: '282aca4d-4cd5-41d2-871a-a5d60e48cc0f', name: 'Grant 07 (FAILED)' }
  ];

  for (const fundInfo of fundsToAnalyze) {
    console.log(`\n### ${fundInfo.name} - ID: ${fundInfo.id}`);
    console.log('----------------------------------------');

    // Get fund details
    const fund = await prisma.fund.findUnique({
      where: { id: fundInfo.id },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        applicationFormAnalysis: true,
        selectionCriteriaAnalysis: true,
        goodExamplesAnalysis: true,
        outputTemplatesAnalysis: true,
        fundBrain: true,
        brainAssembledAt: true
      }
    });

    // Get background jobs
    const jobs = await prisma.backgroundJob.findMany({
      where: { fundId: fundInfo.id },
      orderBy: { createdAt: 'asc' }
    });

    // Get documents
    const docs = await prisma.fundDocument.groupBy({
      by: ['documentType'],
      where: { fundId: fundInfo.id },
      _count: { id: true }
    });

    if (!fund) {
      console.log('FUND NOT FOUND IN DATABASE');
      continue;
    }

    console.log('Fund Status:', fund.status);
    console.log('Created:', fund.createdAt.toISOString());
    console.log('Brain Assembled:', fund.brainAssembledAt ? fund.brainAssembledAt.toISOString() : 'NEVER');

    console.log('\nAnalysis Completion:');
    console.log('  Application Form:', fund.applicationFormAnalysis ? '✅' : '❌');
    console.log('  Selection Criteria:', fund.selectionCriteriaAnalysis ? '✅' : '❌');
    console.log('  Good Examples:', fund.goodExamplesAnalysis ? '✅' : '❌');
    console.log('  Output Templates:', fund.outputTemplatesAnalysis ? '✅' : '❌');
    console.log('  Fund Brain:', fund.fundBrain ? '✅' : '❌');

    console.log('\nDocuments Uploaded:');
    docs.forEach(doc => {
      console.log(`  ${doc.documentType}: ${doc._count.id}`);
    });

    console.log('\nBackground Jobs:');
    jobs.forEach(job => {
      const duration = job.completedAt ?
        `${Math.round((job.completedAt - job.startedAt) / 1000)}s` :
        'N/A';

      console.log(`  Type: ${job.type}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Progress: ${job.processedDocuments}/${job.totalDocuments} (${job.progress}%)`);
      console.log(`  Started: ${job.startedAt ? job.startedAt.toISOString() : 'Not started'}`);
      console.log(`  Completed: ${job.completedAt ? job.completedAt.toISOString() : 'Not completed'}`);
      console.log(`  Duration: ${duration}`);
      console.log(`  Error: ${job.errorMessage || 'None'}`);

      // Check metadata for specific failure points
      if (job.metadata?.lastProcessedDocument) {
        console.log(`  Last Processed Doc: ${job.metadata.lastProcessedDocument}`);
      }
      if (job.metadata?.lastProcessedAt) {
        console.log(`  Last Activity: ${job.metadata.lastProcessedAt}`);
      }
      console.log('');
    });

    // Check for timing patterns
    if (fund.createdAt) {
      const timeSinceCreation = Date.now() - fund.createdAt.getTime();
      const hoursStuck = Math.round(timeSinceCreation / (1000 * 60 * 60) * 10) / 10;
      if (fund.status !== 'ACTIVE' && hoursStuck > 1) {
        console.log(`⚠️  STUCK FOR ${hoursStuck} HOURS`);
      }
    }
  }

  console.log('\n===========================================');
  console.log('KEY DIFFERENCES ANALYSIS');
  console.log('===========================================\n');

  // Check what changed around the time Grant 03 succeeded and Grant 05 failed
  const grant03 = await prisma.fund.findUnique({
    where: { id: '7bce05d0-78db-4cf5-b7dd-c63ed9f3a745' },
    select: { createdAt: true, brainAssembledAt: true }
  });

  const grant05 = await prisma.fund.findUnique({
    where: { id: 'caa93969-d44e-4c38-9a2a-ae1791ec1ef9' },
    select: { createdAt: true }
  });

  console.log('Grant 03 (SUCCESS):');
  console.log('  Created:', grant03.createdAt.toISOString());
  console.log('  Brain Assembled:', grant03.brainAssembledAt?.toISOString());

  console.log('\nGrant 05 (FIRST FAILURE):');
  console.log('  Created:', grant05.createdAt.toISOString());
  console.log('  Time Gap:', Math.round((grant05.createdAt - grant03.createdAt) / (1000 * 60 * 60)) + ' hours');

  // Check for common failure patterns
  const failedJobs = await prisma.backgroundJob.findMany({
    where: {
      fundId: { in: ['caa93969-d44e-4c38-9a2a-ae1791ec1ef9', '282aca4d-4cd5-41d2-871a-a5d60e48cc0f'] },
      status: 'PROCESSING'
    }
  });

  console.log('\nCOMMON FAILURE PATTERN:');
  console.log('All failed jobs stopped at document processing stage');
  console.log('All show PROCESSING status with no error message');
  console.log('All processed exactly 1 document before stopping');

  await prisma.$disconnect();
}

compareFundProcessing().catch(console.error);