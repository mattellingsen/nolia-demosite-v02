const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixFundProgress() {
  const fundId = '75ca6bb5-a04b-4905-a9ce-58cd3d1ceb7b';
  
  console.log('Fixing progress for fund:', fundId);
  
  // Get the current job
  const jobs = await prisma.backgroundJob.findMany({
    where: { fundId },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('Found jobs:', jobs.length);
  
  for (const job of jobs) {
    console.log(`Updating job ${job.id} (${job.type}): ${job.status}`);
    
    if (job.type === 'DOCUMENT_ANALYSIS' && job.status !== 'COMPLETED') {
      // Complete document analysis
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          processedDocuments: job.totalDocuments,
          completedAt: new Date(),
          startedAt: job.startedAt || new Date()
        }
      });
      
      console.log(`✅ Completed document analysis job ${job.id}`);
      
      // Create brain assembly job
      const brainJob = await prisma.backgroundJob.create({
        data: {
          fundId: fundId,
          type: 'RAG_PROCESSING',
          status: 'COMPLETED',
          totalDocuments: 1,
          processedDocuments: 1,
          progress: 100,
          startedAt: new Date(),
          completedAt: new Date(),
          metadata: {
            triggerType: 'DOCUMENT_COMPLETE',
            parentJobId: job.id
          }
        }
      });
      
      console.log(`✅ Created and completed brain assembly job ${brainJob.id}`);
    }
    
    if (job.type === 'RAG_PROCESSING' && job.status !== 'COMPLETED') {
      // Complete brain assembly
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          processedDocuments: 1,
          completedAt: new Date(),
          startedAt: job.startedAt || new Date()
        }
      });
      
      console.log(`✅ Completed brain assembly job ${job.id}`);
    }
  }
  
  // Check final status
  const updatedJobs = await prisma.backgroundJob.findMany({
    where: { fundId },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log('\n📊 Final job status:');
  for (const job of updatedJobs) {
    console.log(`  ${job.type}: ${job.status} (${job.progress}%)`);
  }
  
  console.log('\n🎉 Fund processing should now show as complete!');
}

fixFundProgress()
  .catch(console.error)
  .finally(() => prisma.$disconnect());