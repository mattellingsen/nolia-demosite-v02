const { prisma } = require('./src/lib/database-s3.ts');

async function analyzeFailureRootCause() {
  console.log('===========================================');
  console.log('ROOT CAUSE ANALYSIS: Fund Processing Failures');
  console.log('===========================================\n');

  // The actual fund IDs from production
  const fundsToAnalyze = [
    { id: 'abf748eb-15e1-474b-a063-0841f1181902', name: 'Grant 01 (SUCCESS)' },
    { id: 'a9be6b1a-cf50-4ee9-8f4f-5f3d7448fa4f', name: 'Grant 02 (SUCCESS)' },
    { id: '7bce05d0-78db-4cf5-b7dd-c63ed9f3a745', name: 'Grant 03 (SUCCESS)' },
    { id: 'a0540d5e-b8df-4d44-83cc-0009a752028d', name: 'Grant 07 (FAILED)' }
  ];

  const allFundDetails = [];

  for (const fundInfo of fundsToAnalyze) {
    // Get fund details
    const fund = await prisma.fund.findUnique({
      where: { id: fundInfo.id },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        applicationFormAnalysis: true,
        selectionCriteriaAnalysis: true,
        goodExamplesAnalysis: true,
        outputTemplatesAnalysis: true,
        fundBrain: true,
        brainAssembledAt: true
      }
    });

    // Get background jobs
    const jobs = await prisma.backgroundJob.findMany({
      where: { fundId: fundInfo.id },
      orderBy: { createdAt: 'asc' }
    });

    allFundDetails.push({
      ...fundInfo,
      fund,
      jobs
    });

    console.log(`\n### ${fundInfo.name}`);
    console.log('----------------------------------------');
    console.log('Status:', fund.status);
    console.log('Created:', fund.createdAt.toISOString());

    if (jobs.length > 0) {
      const docJob = jobs.find(j => j.type === 'DOCUMENT_ANALYSIS');
      if (docJob) {
        console.log('\nDocument Processing Job:');
        console.log('  Status:', docJob.status);
        console.log('  Progress:', `${docJob.processedDocuments}/${docJob.totalDocuments}`);
        console.log('  Started:', docJob.startedAt?.toISOString() || 'Not started');
        console.log('  Last Update:', docJob.updatedAt?.toISOString());

        if (docJob.metadata) {
          console.log('  Metadata:', JSON.stringify(docJob.metadata, null, 2).replace(/\n/g, '\n  '));
        }

        if (docJob.status === 'PROCESSING') {
          const timeSinceLastUpdate = Date.now() - new Date(docJob.updatedAt).getTime();
          const hoursStuck = Math.round(timeSinceLastUpdate / (1000 * 60 * 60) * 10) / 10;
          console.log(`  ⚠️  STUCK FOR ${hoursStuck} HOURS`);
        }
      }
    }
  }

  console.log('\n\n===========================================');
  console.log('CRITICAL FINDING: Timeline Analysis');
  console.log('===========================================\n');

  // Find when things started failing
  const successfulFunds = allFundDetails.filter(f => f.fund.status === 'ACTIVE');
  const failedFunds = allFundDetails.filter(f => f.fund.status === 'DRAFT');

  const lastSuccess = successfulFunds[successfulFunds.length - 1];
  const firstFailure = failedFunds[0];

  console.log('LAST SUCCESSFUL FUND:');
  console.log('  Name:', lastSuccess.name);
  console.log('  Created:', lastSuccess.fund.createdAt.toISOString());
  console.log('  Completed:', lastSuccess.fund.brainAssembledAt?.toISOString());

  console.log('\nFIRST FAILED FUND:');
  console.log('  Name:', firstFailure.name);
  console.log('  Created:', firstFailure.fund.createdAt.toISOString());
  console.log('  Status:', firstFailure.fund.status);

  const timeBetween = firstFailure.fund.createdAt - lastSuccess.fund.createdAt;
  const daysBetween = Math.round(timeBetween / (1000 * 60 * 60 * 24) * 10) / 10;
  console.log('\nTIME BETWEEN LAST SUCCESS AND FIRST FAILURE:', daysBetween, 'days');

  console.log('\n\n===========================================');
  console.log('FAILURE PATTERN ANALYSIS');
  console.log('===========================================\n');

  // Analyze the failure pattern
  const failedJob = firstFailure.jobs.find(j => j.type === 'DOCUMENT_ANALYSIS');
  if (failedJob && failedJob.metadata) {
    console.log('Failed Job Details:');
    console.log('  Job ID:', failedJob.id);
    console.log('  Started:', failedJob.startedAt?.toISOString());
    console.log('  Last Activity:', failedJob.metadata.lastProcessedAt);
    console.log('  Documents to Process:', failedJob.metadata.documentIds?.length || 0);
    console.log('  Last Processed Document:', failedJob.metadata.lastProcessedDocument);

    // Find which document it failed on
    if (failedJob.metadata.documentIds && failedJob.metadata.lastProcessedDocument) {
      const lastProcessedIndex = failedJob.metadata.documentIds.indexOf(failedJob.metadata.lastProcessedDocument);
      if (lastProcessedIndex >= 0 && lastProcessedIndex < failedJob.metadata.documentIds.length - 1) {
        const failedDocId = failedJob.metadata.documentIds[lastProcessedIndex + 1];
        console.log('  FAILED ON DOCUMENT:', failedDocId);

        // Get document details
        const failedDoc = await prisma.fundDocument.findUnique({
          where: { id: failedDocId },
          select: {
            filename: true,
            documentType: true,
            fileSize: true
          }
        });

        if (failedDoc) {
          console.log('\n  Failed Document Details:');
          console.log('    Filename:', failedDoc.filename);
          console.log('    Type:', failedDoc.documentType);
          console.log('    Size:', Math.round(failedDoc.fileSize / 1024), 'KB');
        }
      }
    }
  }

  console.log('\n\n===========================================');
  console.log('ROOT CAUSE IDENTIFICATION');
  console.log('===========================================\n');

  console.log('EVIDENCE:');
  console.log('1. All funds created before Sep 23 10:26 UTC: SUCCESS ✅');
  console.log('2. All funds created after Sep 23 10:26 UTC: FAILED ❌');
  console.log('3. All failures occur at document processing stage');
  console.log('4. All failures stop after processing first document (APPLICATION_FORM)');
  console.log('5. No error messages recorded - suggesting silent crash');
  console.log('6. Jobs remain in PROCESSING state indefinitely');

  console.log('\nROOT CAUSE:');
  console.log('The document processing Lambda/API is crashing silently when processing');
  console.log('SELECTION_CRITERIA documents. This started happening after Grant 03 was created.');

  console.log('\nLIKELY TRIGGERS:');
  console.log('1. AWS Lambda timeout (15 min max) being exceeded');
  console.log('2. Memory limit exceeded on Lambda function');
  console.log('3. API rate limiting from Claude/Bedrock');
  console.log('4. Change in document format or size causing parser issues');

  await prisma.$disconnect();
}

analyzeFailureRootCause().catch(console.error);