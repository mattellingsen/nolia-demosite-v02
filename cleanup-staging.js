const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  // Find and delete the failed staging project
  const failedFund = await prisma.fund.findUnique({
    where: { id: 'e25211a7-5deb-4b33-bdcd-cba71cb53c19' },
    include: {
      documents: true,
      backgroundJobs: true
    }
  });

  if (!failedFund) {
    console.log('✅ Failed project already deleted from database\n');
  } else {
    console.log('🗑️  Deleting failed project:', failedFund.name);
    console.log('   Documents:', failedFund.documents?.length);
    console.log('   Background Jobs:', failedFund.backgroundJobs?.length);
    console.log();

    // Delete in order: backgroundJobs -> documents -> fund
    await prisma.backgroundJob.deleteMany({
      where: { fundId: 'e25211a7-5deb-4b33-bdcd-cba71cb53c19' }
    });

    await prisma.document.deleteMany({
      where: { fundId: 'e25211a7-5deb-4b33-bdcd-cba71cb53c19' }
    });

    await prisma.fund.delete({
      where: { id: 'e25211a7-5deb-4b33-bdcd-cba71cb53c19' }
    });

    console.log('✅ Failed project deleted\n');
  }

  // Check for any stuck WORLDBANK jobs
  const stuckJobs = await prisma.backgroundJob.findMany({
    where: {
      moduleType: 'WORLDBANK',
      status: { in: ['PENDING', 'PROCESSING'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (stuckJobs.length > 0) {
    console.log('⚠️  Found', stuckJobs.length, 'stuck WORLDBANK jobs');
    for (const job of stuckJobs) {
      console.log('   Deleting job:', job.id, '|', job.type, '|', job.status);
      await prisma.backgroundJob.delete({ where: { id: job.id } });
    }
    console.log('✅ Stuck jobs cleaned up\n');
  } else {
    console.log('✅ No stuck WORLDBANK jobs\n');
  }

  // Final verification
  const remainingFunds = await prisma.fund.findMany({
    where: { moduleType: 'WORLDBANK' },
    include: {
      backgroundJobs: {
        where: { status: { in: ['PENDING', 'PROCESSING'] } }
      }
    }
  });

  console.log('📊 FINAL STATUS:');
  console.log('================');
  console.log('Total WORLDBANK funds:', remainingFunds.length);

  remainingFunds.forEach(fund => {
    console.log('  -', fund.name, '| Status:', fund.status, '| Active jobs:', fund.backgroundJobs.length);
  });

  const hasActiveJobs = remainingFunds.some(f => f.backgroundJobs.length > 0);
  if (hasActiveJobs) {
    console.log('\n⚠️  WARNING: Some funds still have active jobs');
  } else {
    console.log('\n✅ System is clean - ready for testing');
  }

  await prisma.$disconnect();
}

cleanup().catch(console.error);
