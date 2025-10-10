const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function completeCleanup() {
  try {
    console.log('\n🧹 COMPLETE SYSTEM CLEANUP');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. Mark all stuck PENDING/PROCESSING jobs as FAILED
    const stuckJobs = await prisma.backgroundJob.updateMany({
      where: {
        moduleType: 'WORLDBANK_ADMIN',
        status: { in: ['PENDING', 'PROCESSING'] }
      },
      data: {
        status: 'FAILED',
        errorMessage: 'Cleaned up for fresh test - deployment #39',
        completedAt: new Date()
      }
    });
    console.log('1️⃣  Cleaned stuck jobs:', stuckJobs.count);

    // 2. Delete orphaned DRAFT funds with no documents (failed creations)
    const orphanedFunds = await prisma.fund.findMany({
      where: {
        moduleType: 'WORLDBANK_ADMIN',
        status: 'DRAFT'
      },
      include: {
        documents: true,
        backgroundJobs: true
      }
    });

    let deletedFunds = 0;
    for (const fund of orphanedFunds) {
      if (fund.documents.length === 0) {
        // Delete associated jobs first
        await prisma.backgroundJob.deleteMany({
          where: { fundId: fund.id }
        });
        
        // Delete the fund
        await prisma.fund.delete({
          where: { id: fund.id }
        });
        
        deletedFunds++;
        console.log('   Deleted orphaned fund:', fund.name, '(' + fund.id + ')');
      }
    }
    console.log('2️⃣  Deleted orphaned funds:', deletedFunds);

    // 3. Check for old FAILED jobs (cleanup summary)
    const oldFailedJobs = await prisma.backgroundJob.count({
      where: {
        moduleType: 'WORLDBANK_ADMIN',
        status: 'FAILED',
        createdAt: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });
    console.log('3️⃣  Old failed jobs (>24h):', oldFailedJobs, '(left as-is for history)');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SYSTEM CLEANUP COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error during cleanup:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

completeCleanup();
