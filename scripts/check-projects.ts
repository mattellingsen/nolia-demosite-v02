#!/usr/bin/env tsx
/**
 * Script to check current status of WorldBankGroup projects
 * Usage: npx tsx scripts/check-projects.ts
 */

import { prisma } from '../src/lib/database-s3';

async function checkProjects() {
  try {
    // Find all WORLDBANKGROUP projects (not WORLDBANKGROUP_ADMIN)
    const projects = await prisma.funds.findMany({
      where: {
        moduleType: 'WORLDBANKGROUP'
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('📋 All WorldBankGroup Projects:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (${project.status})`);
      console.log(`   ID: ${project.id}`);
      if (project.description) {
        console.log(`   Description: ${project.description}`);
      }
      console.log(`   Created: ${project.createdAt}`);
      console.log('');
    });

    console.log(`\nTotal: ${projects.length} projects`);
    console.log(`Active: ${projects.filter(p => p.status === 'ACTIVE').length}`);
    console.log(`Processing: ${projects.filter(p => p.status === 'PROCESSING').length}`);
    console.log(`Other: ${projects.filter(p => p.status !== 'ACTIVE' && p.status !== 'PROCESSING').length}`);

  } catch (error) {
    console.error('❌ Error checking projects:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects();
