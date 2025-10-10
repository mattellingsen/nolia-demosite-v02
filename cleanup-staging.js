const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function cleanup() {
  try {
    // Find all stuck jobs
    const stuckJobs = await prisma.backgroundJob.findMany({
      where: {
        moduleType: 'WORLDBANK_ADMIN',
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      }
    });

    console.log('Found ' + stuckJobs.length + ' stuck jobs');
    
    if (stuckJobs.length > 0) {
      // Mark all as failed
      const result = await prisma.backgroundJob.updateMany({
        where: {
          id: {
            in: stuckJobs.map(j => j.id)
          }
        },
        data: {
          status: 'FAILED',
          errorMessage: 'Cleaned up before new test',
          completedAt: new Date()
        }
      });
      
      console.log('Marked ' + result.count + ' jobs as FAILED');
    }

    console.log('✅ Cleanup complete - system ready for testing');
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanup();
