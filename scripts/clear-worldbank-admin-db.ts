#!/usr/bin/env tsx
// Direct database cleanup script for worldbank-admin bases
// Run: npx tsx scripts/clear-worldbank-admin-db.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearWorldBankAdminData() {
  console.log('🗑️  CLEARING WORLDBANK-ADMIN DATABASE');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Get all worldbank-admin bases
    const bases = await prisma.fund.findMany({
      where: { moduleType: 'WORLDBANK_ADMIN' },
      select: { id: true, name: true }
    });

    console.log(`📋 Found ${bases.length} worldbank-admin base(s)\n`);

    if (bases.length === 0) {
      console.log('✅ No bases to delete. Database is already clear!');
      return;
    }

    // 2. Delete all background jobs for these bases
    const jobResult = await prisma.backgroundJob.deleteMany({
      where: {
        fundId: { in: bases.map(b => b.id) }
      }
    });
    console.log(`✅ Deleted ${jobResult.count} background job(s)`);

    // 3. Delete all documents for these bases
    const docResult = await prisma.fundDocument.deleteMany({
      where: {
        fundId: { in: bases.map(b => b.id) }
      }
    });
    console.log(`✅ Deleted ${docResult.count} document(s)`);

    // 4. Delete all bases
    for (const base of bases) {
      await prisma.fund.delete({
        where: { id: base.id }
      });
      console.log(`✅ Deleted base: ${base.name} (${base.id})`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ DONE! All worldbank-admin data has been deleted.');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearWorldBankAdminData();
