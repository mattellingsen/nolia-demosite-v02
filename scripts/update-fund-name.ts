#!/usr/bin/env tsx
/**
 * Script to update fund name from "World Bank Group Procurement Standards 2025" to "Evaluation Report 2025"
 * Usage: npx tsx scripts/update-fund-name.ts
 */

import { prisma } from '../src/lib/database-s3';

async function updateFundName() {
  try {
    const fundId = '789befa3-1df7-4a40-a101-a36e3cdfaf0d';

    // First, check current name
    const currentFund = await prisma.funds.findUnique({
      where: { id: fundId },
      select: { id: true, name: true, status: true }
    });

    if (!currentFund) {
      console.error('❌ Fund not found with ID:', fundId);
      process.exit(1);
    }

    console.log('📋 Current fund details:');
    console.log('   ID:', currentFund.id);
    console.log('   Name:', currentFund.name);
    console.log('   Status:', currentFund.status);
    console.log('');

    // Update the name
    const updatedFund = await prisma.funds.update({
      where: { id: fundId },
      data: { name: 'Evaluation Report 2025' }
    });

    console.log('✅ Fund name updated successfully!');
    console.log('   New name:', updatedFund.name);
    console.log('');
    console.log('🔗 You can verify the change at:');
    console.log('   http://localhost:3000/worldbankgroup-admin/base-created?baseId=' + fundId);
    console.log('   http://localhost:3000/worldbankgroup-admin/setup');

  } catch (error) {
    console.error('❌ Error updating fund name:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateFundName();
