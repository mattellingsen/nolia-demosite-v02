#!/usr/bin/env tsx
// Raw SQL cleanup for worldbank-admin - bypasses Prisma schema issues

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearWorldBankAdmin() {
  console.log('🗑️  CLEARING WORLDBANK-ADMIN (RAW SQL)');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Get IDs first
    const bases: any[] = await prisma.$queryRaw`
      SELECT id, name FROM funds WHERE "moduleType" = 'WORLDBANK_ADMIN'
    `;

    console.log(`📋 Found ${bases.length} worldbank-admin base(s)\n`);

    if (bases.length === 0) {
      console.log('✅ No bases to delete');
      return;
    }

    const baseIds = bases.map(b => b.id);

    // Delete in correct order (respecting foreign keys)

    // 1. Delete background jobs
    const jobs: any = await prisma.$executeRaw`
      DELETE FROM background_jobs WHERE "fundId" = ANY(${baseIds}::text[])
    `;
    console.log(`✅ Deleted ${jobs} background job(s)`);

    // 2. Delete documents
    const docs: any = await prisma.$executeRaw`
      DELETE FROM fund_documents WHERE "fundId" = ANY(${baseIds}::text[])
    `;
    console.log(`✅ Deleted ${docs} document(s)`);

    // 3. Delete funds
    for (const base of bases) {
      await prisma.$executeRaw`
        DELETE FROM funds WHERE id = ${base.id}
      `;
      console.log(`✅ Deleted base: ${base.name} (${base.id})`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ DONE! Database cleared.');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearWorldBankAdmin();
