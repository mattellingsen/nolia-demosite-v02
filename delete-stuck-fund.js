const { prisma } = require('./src/lib/database-s3.ts');

async function deleteStuckFund() {
  const fundId = 'a0540d5e-b8df-4d44-83cc-0009a752028d'; // Grant 07

  console.log(`Deleting stuck fund: ${fundId}`);

  try {
    // Delete in proper order due to foreign key constraints

    // 1. Delete background jobs
    const jobs = await prisma.backgroundJob.deleteMany({
      where: { fundId }
    });
    console.log(`✅ Deleted ${jobs.count} background jobs`);

    // 2. Delete fund documents
    const docs = await prisma.fundDocument.deleteMany({
      where: { fundId }
    });
    console.log(`✅ Deleted ${docs.count} documents`);

    // 3. Delete the fund itself
    const fund = await prisma.fund.delete({
      where: { id: fundId }
    });
    console.log(`✅ Deleted fund: ${fund.name}`);

    console.log('\n🎉 Stuck fund successfully deleted!');
    console.log('The system is now clean and ready for new fund creation.');

  } catch (error) {
    console.error('❌ Error deleting fund:', error);
  }

  await prisma.$disconnect();
}

deleteStuckFund().catch(console.error);