#!/usr/bin/env node

/**
 * Comprehensive investigation script for stuck fund processing
 * Analyzes fund ID: 282aca4d-4cd5-41d2-871a-a5d60e48cc0f
 *
 * This script will:
 * 1. Query all relevant database tables
 * 2. Analyze job metadata and progress
 * 3. Check for patterns in successful vs failed funds
 * 4. Identify the exact point of failure
 * 5. Output a clear report of findings
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_FUND_ID = 'a0540d5e-b8df-4d44-83cc-0009a752028d';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title) {
  log('\n' + '='.repeat(80), colors.cyan);
  log(`  ${title}`, colors.bright + colors.cyan);
  log('='.repeat(80) + '\n', colors.cyan);
}

function subheader(title) {
  log('\n' + '-'.repeat(60), colors.blue);
  log(`  ${title}`, colors.blue);
  log('-'.repeat(60), colors.blue);
}

async function investigateStuckFund() {
  try {
    header('INVESTIGATION: Stuck Fund Processing');
    log(`Target Fund ID: ${TARGET_FUND_ID}`);
    log(`Investigation Started: ${new Date().toISOString()}\n`);

    // ==========================================
    // 1. FETCH FUND DETAILS
    // ==========================================
    subheader('1. Fund Details');

    const fund = await prisma.fund.findUnique({
      where: { id: TARGET_FUND_ID },
      include: {
        documents: {
          orderBy: { uploadedAt: 'asc' }
        },
        backgroundJobs: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!fund) {
      log('❌ Fund not found!', colors.red);
      return;
    }

    log(`Fund Name: ${fund.name}`);
    log(`Status: ${fund.status}`);
    log(`Created At: ${fund.createdAt}`);
    log(`Updated At: ${fund.updatedAt}`);
    log(`Total Documents: ${fund.documents.length}`);
    log(`Total Jobs: ${fund.backgroundJobs.length}`);

    // ==========================================
    // 2. ANALYZE DOCUMENT STATUS
    // ==========================================
    subheader('2. Document Analysis');

    const documentsByType = {};
    fund.documents.forEach(doc => {
      if (!documentsByType[doc.documentType]) {
        documentsByType[doc.documentType] = [];
      }
      documentsByType[doc.documentType].push(doc);
    });

    log('\nDocuments by Type:');
    Object.entries(documentsByType).forEach(([type, docs]) => {
      log(`  ${type}: ${docs.length} document(s)`);
      docs.forEach(doc => {
        log(`    - ${doc.filename} (${doc.fileSize} bytes, uploaded: ${doc.uploadedAt})`);
      });
    });

    // Check analysis status
    log('\nAnalysis Status:');
    const analysisFields = [
      'applicationFormAnalysis',
      'selectionCriteriaAnalysis',
      'goodExamplesAnalysis',
      'outputTemplatesAnalysis'
    ];

    analysisFields.forEach(field => {
      const analysis = fund[field];
      if (analysis) {
        const status = analysis.status || (analysis.analysisMode ? 'COMPLETED' : 'UNKNOWN');
        const mode = analysis.analysisMode || 'UNKNOWN';
        const hasError = analysis.error || analysis.analysisWarning;

        if (hasError) {
          log(`  ${field}: ${status} (${mode}) ⚠️ ${hasError}`, colors.yellow);
        } else {
          log(`  ${field}: ${status} (${mode})`, status === 'COMPLETED' ? colors.green : colors.yellow);
        }
      } else {
        log(`  ${field}: NULL ❌`, colors.red);
      }
    });

    // ==========================================
    // 3. ANALYZE BACKGROUND JOBS
    // ==========================================
    subheader('3. Background Jobs Analysis');

    for (const job of fund.backgroundJobs) {
      log(`\nJob ID: ${job.id}`);
      log(`  Type: ${job.type}`);
      log(`  Status: ${job.status}`,
        job.status === 'COMPLETED' ? colors.green :
        job.status === 'FAILED' ? colors.red :
        job.status === 'PROCESSING' ? colors.yellow : '');
      log(`  Created: ${job.createdAt}`);
      log(`  Started: ${job.startedAt || 'Never'}`);
      log(`  Completed: ${job.completedAt || 'Never'}`);
      log(`  Progress: ${job.progress}%`);
      log(`  Documents: ${job.processedDocuments}/${job.totalDocuments}`);

      if (job.errorMessage) {
        log(`  Error: ${job.errorMessage}`, colors.red);
      }

      // Analyze metadata
      if (job.metadata) {
        log('  Metadata:', colors.cyan);
        const metadata = typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata;

        if (metadata.documentIds) {
          log(`    Document IDs: ${metadata.documentIds.length} documents`);

          // Check which documents were processed
          const processedDocs = [];
          const unprocessedDocs = [];

          for (const docId of metadata.documentIds) {
            const doc = fund.documents.find(d => d.id === docId);
            if (doc) {
              if (metadata.lastProcessedDocument === docId ||
                  job.processedDocuments > metadata.documentIds.indexOf(docId)) {
                processedDocs.push(doc);
              } else {
                unprocessedDocs.push(doc);
              }
            }
          }

          if (processedDocs.length > 0) {
            log(`    Processed (${processedDocs.length}):`, colors.green);
            processedDocs.forEach(doc => {
              log(`      ✓ ${doc.filename} (${doc.documentType})`);
            });
          }

          if (unprocessedDocs.length > 0) {
            log(`    Unprocessed (${unprocessedDocs.length}):`, colors.red);
            unprocessedDocs.forEach(doc => {
              log(`      ✗ ${doc.filename} (${doc.documentType})`);
            });
          }
        }

        if (metadata.lastProcessedDocument) {
          const lastDoc = fund.documents.find(d => d.id === metadata.lastProcessedDocument);
          log(`    Last Processed: ${lastDoc ? lastDoc.filename : metadata.lastProcessedDocument}`, colors.yellow);
        }

        if (metadata.lastProcessedAt) {
          log(`    Last Activity: ${metadata.lastProcessedAt}`);
        }
      }

      // Calculate time spent
      if (job.startedAt) {
        const endTime = job.completedAt || new Date();
        const duration = endTime - new Date(job.startedAt);
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        log(`  Duration: ${minutes}m ${seconds}s`);
      }
    }

    // ==========================================
    // 4. COMPARE WITH OTHER FUNDS
    // ==========================================
    subheader('4. Comparison with Other Funds');

    // Get recent funds for comparison
    const recentFunds = await prisma.fund.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        backgroundJobs: true,
        documents: true
      },
      orderBy: { createdAt: 'desc' }
    });

    log(`\nAnalyzing ${recentFunds.length} recent funds:`);

    const fundStats = recentFunds.map(f => {
      const docAnalysisJob = f.backgroundJobs.find(j => j.type === 'DOCUMENT_ANALYSIS');
      const ragJob = f.backgroundJobs.find(j => j.type === 'RAG_PROCESSING');

      return {
        id: f.id,
        name: f.name,
        status: f.status,
        documents: f.documents.length,
        docJobStatus: docAnalysisJob?.status || 'NONE',
        docJobProgress: docAnalysisJob?.progress || 0,
        docJobProcessed: docAnalysisJob?.processedDocuments || 0,
        ragJobStatus: ragJob?.status || 'NONE',
        isStuck: f.status === 'PROCESSING' && docAnalysisJob?.status === 'PROCESSING',
        hasError: docAnalysisJob?.errorMessage || ragJob?.errorMessage
      };
    });

    // Group by status
    const successfulFunds = fundStats.filter(f => f.status === 'ACTIVE' && f.docJobStatus === 'COMPLETED');
    const stuckFunds = fundStats.filter(f => f.isStuck);
    const failedFunds = fundStats.filter(f => f.docJobStatus === 'FAILED' || f.hasError);

    log(`  Successful: ${successfulFunds.length} funds`);
    log(`  Stuck: ${stuckFunds.length} funds`, stuckFunds.length > 0 ? colors.yellow : '');
    log(`  Failed: ${failedFunds.length} funds`, failedFunds.length > 0 ? colors.red : '');

    if (stuckFunds.length > 0) {
      log('\nOther Stuck Funds:', colors.yellow);
      stuckFunds.forEach(f => {
        log(`  - ${f.name} (${f.id})`);
        log(`    Documents: ${f.docJobProcessed}/${f.documents} processed`);
      });
    }

    // ==========================================
    // 5. IDENTIFY PATTERNS
    // ==========================================
    subheader('5. Pattern Analysis');

    // Check for common patterns in stuck funds
    const targetJob = fund.backgroundJobs.find(j => j.type === 'DOCUMENT_ANALYSIS' && j.status === 'PROCESSING');

    if (targetJob) {
      log('\n🔍 Analyzing failure pattern for target fund:');

      // Pattern 1: Stopped after first document
      if (targetJob.processedDocuments === 1 && targetJob.totalDocuments > 1) {
        log('  ⚠️ Pattern detected: Stopped after processing first document', colors.yellow);
        log('  This suggests the job processor crashed or timed out after the first document');

        // Check which document was processed
        const metadata = typeof targetJob.metadata === 'string' ? JSON.parse(targetJob.metadata) : targetJob.metadata;
        if (metadata?.lastProcessedDocument) {
          const lastDoc = fund.documents.find(d => d.id === metadata.lastProcessedDocument);
          if (lastDoc) {
            log(`  Last successful: ${lastDoc.filename} (${lastDoc.documentType})`);

            // Find the next document that should have been processed
            const docIds = metadata.documentIds || [];
            const lastIndex = docIds.indexOf(metadata.lastProcessedDocument);
            if (lastIndex >= 0 && lastIndex < docIds.length - 1) {
              const nextDocId = docIds[lastIndex + 1];
              const nextDoc = fund.documents.find(d => d.id === nextDocId);
              if (nextDoc) {
                log(`  Failed on: ${nextDoc.filename} (${nextDoc.documentType})`, colors.red);
                log(`  Failure point: Processing document ${lastIndex + 2} of ${docIds.length}`);
              }
            }
          }
        }
      }

      // Pattern 2: No progress at all
      if (targetJob.processedDocuments === 0) {
        log('  ⚠️ Pattern detected: No documents processed at all', colors.yellow);
        log('  This suggests the job never actually started processing');
      }

      // Pattern 3: Time-based analysis
      if (targetJob.startedAt) {
        const timeSinceStart = Date.now() - new Date(targetJob.startedAt).getTime();
        const minutesSinceStart = Math.floor(timeSinceStart / 60000);

        if (minutesSinceStart > 5) {
          log(`  ⚠️ Pattern detected: Job running for ${minutesSinceStart} minutes without completion`, colors.yellow);
          log('  This suggests a timeout or infinite loop in processing');
        }
      }
    }

    // ==========================================
    // 6. ROOT CAUSE ANALYSIS
    // ==========================================
    header('ROOT CAUSE ANALYSIS');

    const rootCauses = [];
    const recommendations = [];

    // Analyze the specific failure
    if (targetJob) {
      const metadata = typeof targetJob.metadata === 'string' ? JSON.parse(targetJob.metadata) : targetJob.metadata;

      // ROOT CAUSE 1: Job stopped after processing application form
      if (targetJob.processedDocuments === 1 && metadata?.lastProcessedDocument) {
        const lastDoc = fund.documents.find(d => d.id === metadata.lastProcessedDocument);
        if (lastDoc?.documentType === 'APPLICATION_FORM') {
          rootCauses.push({
            cause: 'Job processing stopped after APPLICATION_FORM',
            evidence: `Processed 1/${targetJob.totalDocuments} documents, last was ${lastDoc.filename}`,
            likelihood: 'HIGH'
          });

          // Check if there's an issue with the next document
          const docIds = metadata.documentIds || [];
          const nextDocIndex = docIds.indexOf(metadata.lastProcessedDocument) + 1;
          if (nextDocIndex < docIds.length) {
            const nextDocId = docIds[nextDocIndex];
            const nextDoc = fund.documents.find(d => d.id === nextDocId);
            if (nextDoc) {
              rootCauses.push({
                cause: `Failed while processing ${nextDoc.documentType}: ${nextDoc.filename}`,
                evidence: 'Job stopped at this document without marking as failed',
                likelihood: 'HIGH'
              });

              recommendations.push(`1. Check S3 accessibility for key: ${nextDoc.s3Key}`);
              recommendations.push(`2. Verify document content is not corrupted: ${nextDoc.filename}`);
              recommendations.push(`3. Check if Claude API had issues processing ${nextDoc.documentType} documents`);
            }
          }
        }
      }

      // ROOT CAUSE 2: No error message but stuck in PROCESSING
      if (targetJob.status === 'PROCESSING' && !targetJob.errorMessage) {
        rootCauses.push({
          cause: 'Silent failure - job crashed without proper error handling',
          evidence: 'Job in PROCESSING status with no error message after 2+ hours',
          likelihood: 'HIGH'
        });

        recommendations.push('4. The job processor likely crashed or was terminated unexpectedly');
        recommendations.push('5. Check for memory/timeout issues in the document processor');
        recommendations.push('6. Add better error handling and recovery mechanisms');
      }

      // ROOT CAUSE 3: Missing brain assembly job
      const ragJob = fund.backgroundJobs.find(j => j.type === 'RAG_PROCESSING');
      if (!ragJob && targetJob.processedDocuments > 0) {
        rootCauses.push({
          cause: 'Brain assembly (RAG_PROCESSING) job was never created',
          evidence: 'Document processing partially complete but no RAG job exists',
          likelihood: 'MEDIUM'
        });

        recommendations.push('7. The job completion trigger for brain assembly may have failed');
        recommendations.push('8. Check updateJobProgress logic for triggering brain assembly');
      }
    }

    // ==========================================
    // 7. FINAL REPORT
    // ==========================================
    header('INVESTIGATION SUMMARY');

    log('🔴 FUND STATUS:', colors.red);
    log(`  Fund "${fund.name}" is stuck in PROCESSING status`);
    log(`  Last activity: ${targetJob?.metadata?.lastProcessedAt || targetJob?.startedAt || 'Unknown'}`);
    log(`  Documents processed: ${targetJob?.processedDocuments || 0}/${targetJob?.totalDocuments || fund.documents.length}`);

    log('\n🔍 ROOT CAUSES IDENTIFIED:', colors.yellow);
    rootCauses.forEach((rc, i) => {
      log(`\n  ${i + 1}. ${rc.cause} [${rc.likelihood}]`, colors.bright);
      log(`     Evidence: ${rc.evidence}`);
    });

    log('\n💡 RECOMMENDATIONS:', colors.green);
    recommendations.forEach(rec => {
      log(`  ${rec}`);
    });

    log('\n🔧 IMMEDIATE ACTIONS:', colors.cyan);
    log('  1. The background processor should automatically retry this job');
    log('  2. If not, manually trigger processing via /api/jobs/process endpoint');
    log(`  3. Consider marking job as failed and creating a new one`);

    if (targetJob) {
      log(`\n  curl -X POST http://localhost:3000/api/jobs/process \\`);
      log(`    -H "Content-Type: application/json" \\`);
      log(`    -d '{"jobId": "${targetJob.id}", "retry": true}'`);
    }

    log('\n' + '='.repeat(80), colors.cyan);
    log('Investigation Complete: ' + new Date().toISOString());
    log('='.repeat(80) + '\n', colors.cyan);

  } catch (error) {
    log(`\n❌ Investigation Error: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the investigation
investigateStuckFund().catch(console.error);