const { prisma } = require('./src/lib/database-s3.ts');

async function checkGrant04Processing() {
  const fundId = 'a7eaa519-ec3e-4c1c-bba3-a7849f11587c';

  console.log('=== Grant 04 Processing Status ===\n');

  // Check background jobs
  const jobs = await prisma.backgroundJob.findMany({
    where: { fundId },
    orderBy: { createdAt: 'desc' }
  });

  if (jobs.length === 0) {
    console.log('❌ NO BACKGROUND JOBS FOUND - Processing may not have started');
    return;
  }

  console.log('Background Jobs:');
  jobs.forEach(job => {
    const timeSinceUpdate = Date.now() - new Date(job.updatedAt).getTime();
    const minutesStuck = Math.round(timeSinceUpdate / (1000 * 60));

    console.log(`  Job ID: ${job.id}`);
    console.log(`  Type: ${job.type}`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Progress: ${job.processedDocuments}/${job.totalDocuments}`);
    console.log(`  Started: ${job.startedAt ? job.startedAt.toISOString() : 'Not started'}`);
    console.log(`  Last Update: ${job.updatedAt.toISOString()}`);
    console.log(`  Minutes since last update: ${minutesStuck}`);
    console.log(`  Error: ${job.errorMessage || 'None'}`);

    if (job.metadata) {
      console.log(`  Last processed doc: ${job.metadata.lastProcessedDocument || 'None'}`);
    }
    console.log('');
  });

  // Check if processing appears stuck
  const activeJob = jobs.find(j => j.status === 'PROCESSING');
  if (activeJob) {
    const timeSinceUpdate = Date.now() - new Date(activeJob.updatedAt).getTime();
    const minutesStuck = Math.round(timeSinceUpdate / (1000 * 60));

    if (minutesStuck > 10) {
      console.log('⚠️  PROCESSING APPEARS STUCK:');
      console.log(`   Job has been inactive for ${minutesStuck} minutes`);
      console.log('   This should trigger timeout protection within 5 minutes per API call');
    } else if (minutesStuck < 2) {
      console.log('✅ PROCESSING IS ACTIVE (updated within 2 minutes)');
    } else {
      console.log(`⏳ PROCESSING IN PROGRESS (${minutesStuck} minutes since last update)`);
    }
  } else {
    const failedJob = jobs.find(j => j.status === 'FAILED');
    if (failedJob) {
      console.log('❌ JOB FAILED - This is expected with new timeout protection');
      console.log('   User should see "Retry AI Processing" button');
    }
  }

  await prisma.$disconnect();
}

checkGrant04Processing().catch(console.error);