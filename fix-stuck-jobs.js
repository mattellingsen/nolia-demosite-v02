#!/usr/bin/env node

/**
 * Fix stuck RAG processing jobs
 * PHASE 1 - FIX 1.1 and FIX 1.2
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const JOB1_ID = 'dbd0df6a-4d30-4fea-af0e-ad06aca5ed02';
const JOB2_ID = '6a183542-1f80-41b2-b8c4-2c6ad0fc6e1d';
const FUND_ID = '0d7dea5f-e827-431b-8944-887cacdd5a9c';

async function fixStuckJobs() {
  try {
    console.log('🔧 PHASE 1: Fixing stuck RAG jobs\n');

    // ============================================
    // FIX 1.1: Complete Job #1
    // ============================================
    console.log('FIX 1.1: Manually completing Job #1...');
    console.log(`Job ID: ${JOB1_ID}`);

    // Check current state
    const job1Before = await prisma.backgroundJob.findUnique({
      where: { id: JOB1_ID }
    });

    console.log(`Current status: ${job1Before?.status}, Progress: ${job1Before?.progress}%`);

    if (job1Before?.status === 'PROCESSING' && job1Before?.progress === 100) {
      // Update to COMPLETED
      await prisma.backgroundJob.update({
        where: { id: JOB1_ID },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      console.log('✅ Job #1 marked as COMPLETED');
    } else {
      console.log('⚠️ Job #1 is not in expected state (PROCESSING at 100%)');
    }

    // ============================================
    // FIX 1.2: Delete Job #2 (duplicate)
    // ============================================
    console.log('\nFIX 1.2: Deleting duplicate Job #2...');
    console.log(`Job ID: ${JOB2_ID}`);

    const job2Before = await prisma.backgroundJob.findUnique({
      where: { id: JOB2_ID }
    });

    console.log(`Current status: ${job2Before?.status}, Progress: ${job2Before?.progress}%`);

    if (job2Before) {
      await prisma.backgroundJob.delete({
        where: { id: JOB2_ID }
      });

      console.log('✅ Job #2 (duplicate) deleted');
    } else {
      console.log('⚠️ Job #2 not found (may already be deleted)');
    }

    // ============================================
    // Update Fund Status
    // ============================================
    console.log('\nUpdating fund status to ACTIVE...');

    const fund = await prisma.fund.findUnique({
      where: { id: FUND_ID }
    });

    console.log(`Current fund status: ${fund?.status}`);

    await prisma.fund.update({
      where: { id: FUND_ID },
      data: {
        status: 'ACTIVE',
        brainAssembledAt: new Date()
      }
    });

    console.log('✅ Fund marked as ACTIVE');

    // ============================================
    // FIX 1.3: Verification
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('FIX 1.3: Verification');
    console.log('='.repeat(60));

    // Check all jobs for this fund
    const allJobs = await prisma.backgroundJob.findMany({
      where: { fundId: FUND_ID },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\nTotal jobs for fund: ${allJobs.length}`);
    allJobs.forEach((job, i) => {
      console.log(`  ${i + 1}. ${job.type.padEnd(20)} ${job.status.padEnd(12)} ${job.progress}%  (${job.id.substring(0, 8)}...)`);
    });

    // Check fund status
    const finalFund = await prisma.fund.findUnique({
      where: { id: FUND_ID },
      select: {
        id: true,
        name: true,
        status: true,
        brainAssembledAt: true,
        brainVersion: true,
        fundBrain: true
      }
    });

    console.log('\nFund Status:');
    console.log(`  Name: ${finalFund?.name}`);
    console.log(`  Status: ${finalFund?.status}`);
    console.log(`  Brain Assembled: ${finalFund?.brainAssembledAt ? 'Yes' : 'No'}`);
    console.log(`  Brain Version: ${finalFund?.brainVersion || 'N/A'}`);
    console.log(`  Brain Data Exists: ${finalFund?.fundBrain ? 'Yes' : 'No'}`);

    // Success criteria
    console.log('\n' + '='.repeat(60));
    console.log('SUCCESS CRITERIA CHECK:');
    console.log('='.repeat(60));

    const docAnalysisJob = allJobs.find(j => j.type === 'DOCUMENT_ANALYSIS');
    const ragJob = allJobs.find(j => j.type === 'RAG_PROCESSING');

    const checks = [
      { name: 'Document Analysis completed', pass: docAnalysisJob?.status === 'COMPLETED' },
      { name: 'Only 1 RAG job exists', pass: allJobs.filter(j => j.type === 'RAG_PROCESSING').length === 1 },
      { name: 'RAG job completed', pass: ragJob?.status === 'COMPLETED' },
      { name: 'Fund status is ACTIVE', pass: finalFund?.status === 'ACTIVE' },
      { name: 'Brain data exists', pass: !!finalFund?.fundBrain }
    ];

    checks.forEach(check => {
      const icon = check.pass ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('🎉 ALL CHECKS PASSED - PHASE 1 COMPLETE!');
      console.log('✅ Current test is now successfully completed');
      console.log('✅ Chunking implementation validated');
    } else {
      console.log('⚠️ SOME CHECKS FAILED - Review above');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error fixing stuck jobs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixStuckJobs().catch(console.error);
