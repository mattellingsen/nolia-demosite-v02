#!/usr/bin/env tsx
/**
 * Script to update Indonesia Health Systems Strengthening Project to be the oldest (earliest createdAt)
 * so it appears as second card (first in database results, after the hardcoded "Setup new project" card)
 * Usage: npx tsx scripts/update-indonesia-project-date.ts
 */

import { prisma } from '../src/lib/database-s3';

async function updateIndonesiaProjectDate() {
  try {
    const projectId = '8641b9a0-1ff1-4ebc-90ba-7d9d4e663185'; // Indonesia Health Systems Strengthening Project

    // First, check current values
    const current = await prisma.funds.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true
      }
    });

    if (!current) {
      console.error('❌ Project not found with ID:', projectId);
      process.exit(1);
    }

    console.log('📋 Current project details:');
    console.log('   ID:', current.id);
    console.log('   Name:', current.name);
    console.log('   Status:', current.status);
    console.log('   CreatedAt:', current.createdAt);
    console.log('');

    // Since projects are sorted DESC (newest first), we want Indonesia to be OLDEST
    // so new projects appear BEFORE it in the list
    // Set to an old date to ensure new projects take second place
    const oldestDate = new Date('2025-10-20T00:00:00.000Z'); // Earlier than Oct 23 (oldest existing)

    const updated = await prisma.funds.update({
      where: { id: projectId },
      data: {
        createdAt: oldestDate,
        updatedAt: new Date()
      }
    });

    console.log('✅ Project date updated successfully!');
    console.log('   New createdAt:', updated.createdAt);
    console.log('');
    console.log('💡 Card ordering (DESC sort):');
    console.log('   1st: "Setup new project" (hardcoded in UI)');
    console.log('   2nd+: New projects (newest dates appear first)');
    console.log('   Last: Indonesia Health Systems Strengthening Project (oldest date)');
    console.log('');
    console.log('🔗 You can verify the change at:');
    console.log('   http://localhost:3000/worldbankgroup/setup');

  } catch (error) {
    console.error('❌ Error updating project date:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateIndonesiaProjectDate();
