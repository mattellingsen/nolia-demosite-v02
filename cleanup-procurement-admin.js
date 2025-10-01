// Cleanup script for procurement-admin knowledgebases
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupProcurementAdmin() {
  try {
    console.log('🗑️ Starting cleanup of procurement-admin data...');

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

    console.log(`Found ${procurementFunds.length} procurement admin knowledgebases to delete`);

    for (const fund of procurementFunds) {
      console.log(`Deleting fund: ${fund.name} (${fund.id})`);

      // Delete background jobs first
      await prisma.backgroundJob.deleteMany({
        where: {
          fundId: fund.id
        }
      });
      console.log(`  ✅ Deleted ${fund.backgroundJobs.length} background jobs`);

      // Delete documents
      await prisma.fundDocument.deleteMany({
        where: {
          fundId: fund.id
        }
      });
      console.log(`  ✅ Deleted ${fund.documents.length} documents`);

      // Delete the fund itself
      await prisma.fund.delete({
        where: {
          id: fund.id
        }
      });
      console.log(`  ✅ Deleted fund: ${fund.name}`);
    }

    console.log('🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupProcurementAdmin();