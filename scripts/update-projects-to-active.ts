#!/usr/bin/env tsx
/**
 * Script to update the 5 new WorldBankGroup projects to ACTIVE status
 * Usage: npx tsx scripts/update-projects-to-active.ts
 */

import { prisma } from '../src/lib/database-s3';

async function updateProjectsToActive() {
  try {
    const projectIds = [
      'edd227fe-768b-4e81-8cfa-b5d4c7ca5a05', // OPRC
      '44b41c07-43b2-4002-9232-c3ce7003b516', // MRI
      'cbbfc870-1242-46cd-9cbf-37076ba911a2', // Molecular eMRD
      '99e7e93b-ab94-4737-8823-bc3369d5bb32', // Minor Surgery Equipment
      '78708f95-4066-4edc-acd8-837e4ba98414'  // Infant Warmers
    ];

    console.log('📋 Updating 5 projects to ACTIVE status...\n');

    for (const projectId of projectIds) {
      // Get current status
      const current = await prisma.funds.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, status: true }
      });

      if (!current) {
        console.log(`❌ Project ${projectId} not found`);
        continue;
      }

      console.log(`Updating: ${current.name}`);
      console.log(`  Current status: ${current.status}`);

      // Update to ACTIVE
      const updated = await prisma.funds.update({
        where: { id: projectId },
        data: {
          status: 'ACTIVE',
          updatedAt: new Date()
        }
      });

      console.log(`  ✅ New status: ${updated.status}`);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All 5 projects updated to ACTIVE status!');
    console.log('');
    console.log('🔗 You can verify the changes at:');
    console.log('   http://localhost:3000/worldbankgroup/setup');
    console.log('');
    console.log('Individual project pages:');
    projectIds.forEach(id => {
      console.log(`   http://localhost:3000/worldbankgroup/project-created?projectId=${id}`);
    });

  } catch (error) {
    console.error('❌ Error updating projects:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateProjectsToActive();
