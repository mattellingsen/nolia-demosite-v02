#!/usr/bin/env node
/**
 * Read-only monitoring script for RAG job processing
 * NO INTERVENTION - Just observe and report
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_ID = 'f0152825-1db8-4459-aeff-1a9cf6ff9bf2';

async function monitorJob() {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 MONITORING: ${BASE_ID}`);
    console.log(`⏰ ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    // Get fund details
    const fund = await prisma.fund.findUnique({
      where: { id: BASE_ID },
      include: {
        documents: true,
        backgroundJobs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!fund) {
      console.log('❌ Fund not found');
      return;
    }

    console.log(`\n📊 FUND STATUS:`);
    console.log(`   Name: ${fund.name}`);
    console.log(`   Status: ${fund.status}`);
    console.log(`   Module: ${fund.moduleType}`);
    console.log(`   Documents: ${fund.documents.length}`);
    console.log(`   Created: ${fund.createdAt.toISOString()}`);

    if (fund.documents.length > 0) {
      console.log(`\n📄 DOCUMENTS:`);
      fund.documents.forEach((doc, i) => {
        console.log(`   ${i + 1}. ${doc.filename} (${doc.documentType})`);
        console.log(`      Size: ${Math.round(doc.fileSize / 1024)}KB`);
        console.log(`      S3: ${doc.s3Key.substring(0, 60)}...`);
      });
    }

    if (fund.backgroundJobs.length > 0) {
      console.log(`\n⚙️  BACKGROUND JOBS (${fund.backgroundJobs.length} total):`);
      fund.backgroundJobs.forEach((job, i) => {
        const age = Math.round((Date.now() - job.createdAt.getTime()) / 1000);
        console.log(`\n   Job ${i + 1}: ${job.type}`);
        console.log(`   ID: ${job.id}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Progress: ${job.progress}%`);
        console.log(`   Processed: ${job.processedDocuments}/${job.totalDocuments}`);
        console.log(`   Age: ${age}s`);

        if (job.status === 'PROCESSING' && job.startedAt) {
          const duration = Math.round((Date.now() - job.startedAt.getTime()) / 1000);
          console.log(`   Running for: ${duration}s`);
        }

        if (job.status === 'COMPLETED' && job.completedAt) {
          const duration = Math.round((job.completedAt.getTime() - job.createdAt.getTime()) / 1000);
          console.log(`   Completed in: ${duration}s`);
        }

        if (job.errorMessage) {
          console.log(`   ❌ Error: ${job.errorMessage}`);
        }

        if (job.metadata) {
          console.log(`   Metadata: ${JSON.stringify(job.metadata).substring(0, 100)}...`);
        }
      });
    } else {
      console.log(`\n⚙️  No background jobs found`);
    }

    // Determine overall status
    const latestJob = fund.backgroundJobs[0];
    let statusEmoji = '⏳';
    let statusText = 'Waiting for job creation';

    if (latestJob) {
      if (latestJob.status === 'COMPLETED') {
        statusEmoji = '✅';
        statusText = 'SUCCESS - RAG processing completed';
      } else if (latestJob.status === 'FAILED') {
        statusEmoji = '❌';
        statusText = `FAILED - ${latestJob.errorMessage || 'Unknown error'}`;
      } else if (latestJob.status === 'PROCESSING') {
        statusEmoji = '🔄';
        statusText = `PROCESSING - ${latestJob.progress}% complete`;
      } else if (latestJob.status === 'PENDING') {
        statusEmoji = '⏳';
        statusText = 'PENDING - Waiting for processing to start';
      }
    }

    console.log(`\n${statusEmoji} OVERALL STATUS: ${statusText}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Monitoring error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

monitorJob();
