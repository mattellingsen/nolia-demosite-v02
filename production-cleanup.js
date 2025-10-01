// Direct production database cleanup for procurement-admin
const { PrismaClient } = require('@prisma/client');

// Use the production database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function cleanupProductionProcurementAdmin() {
  try {
    console.log('🗑️ Starting production cleanup of procurement-admin data...');
    console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Not found');

    // Get all procurement admin funds
    const procurementFunds = await prisma.fund.findMany({
      where: {
        moduleType: 'PROCUREMENT_ADMIN'
      },
      include: {
        documents: true,
        backgroundJobs: true
      }
    });

    console.log(`📊 Found ${procurementFunds.length} procurement admin knowledgebases to delete`);

    if (procurementFunds.length === 0) {
      console.log('✅ No procurement admin data found - database is already clean!');
      return;
    }

    // List what we found
    procurementFunds.forEach((fund, index) => {
      console.log(`${index + 1}. ${fund.name} (${fund.id})`);
      console.log(`   - Documents: ${fund.documents.length}`);
      console.log(`   - Jobs: ${fund.backgroundJobs.length}`);
      console.log(`   - Status: ${fund.status}`);
    });

    let deletedFunds = 0;
    let deletedJobs = 0;
    let deletedDocuments = 0;

    for (const fund of procurementFunds) {
      console.log(`\n🗑️ Deleting fund: ${fund.name} (${fund.id})`);

      // Delete background jobs first
      const deletedJobsResult = await prisma.backgroundJob.deleteMany({
        where: {
          fundId: fund.id
        }
      });
      deletedJobs += deletedJobsResult.count;
      console.log(`  ✅ Deleted ${deletedJobsResult.count} background jobs`);

      // Delete documents
      const deletedDocsResult = await prisma.fundDocument.deleteMany({
        where: {
          fundId: fund.id
        }
      });
      deletedDocuments += deletedDocsResult.count;
      console.log(`  ✅ Deleted ${deletedDocsResult.count} documents`);

      // Delete the fund itself
      await prisma.fund.delete({
        where: {
          id: fund.id
        }
      });
      deletedFunds++;
      console.log(`  ✅ Deleted fund: ${fund.name}`);
    }

    console.log('\n🎉 Production cleanup completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Funds deleted: ${deletedFunds}`);
    console.log(`   - Jobs deleted: ${deletedJobs}`);
    console.log(`   - Documents deleted: ${deletedDocuments}`);

  } catch (error) {
    console.error('❌ Error during production cleanup:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupProductionProcurementAdmin();