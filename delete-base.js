#!/usr/bin/env node
/**
 * Delete a stuck procurement base and clean up all related data
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_ID = process.argv[2] || '512aa2b9-6418-4aa5-9133-5701bba75a51';

async function deleteBase() {
  try {
    console.log(`🗑️  Deleting base: ${BASE_ID}`);

    // Delete in order (foreign key constraints)

    // 1. Delete background jobs
    const jobs = await prisma.backgroundJob.deleteMany({
      where: { fundId: BASE_ID }
    });
    console.log(`✅ Deleted ${jobs.count} background jobs`);

    // 2. Delete documents
    const docs = await prisma.fundDocument.deleteMany({
      where: { fundId: BASE_ID }
    });
    console.log(`✅ Deleted ${docs.count} documents`);

    // 3. Delete the fund itself
    await prisma.fund.delete({
      where: { id: BASE_ID }
    });
    console.log(`✅ Deleted fund: ${BASE_ID}`);

    console.log('\n✨ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBase();
