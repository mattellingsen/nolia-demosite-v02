import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeFlow() {
  console.log('\n=== ANALYZING PROCESSING FLOW ISSUE ===\n');
  
  const jobId = '210b6560-e733-44a2-8671-7a3696aa6586';
  
  // Get detailed job info
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId }
  });
  
  console.log('Current Job State:');
  console.log('  Status:', job.status);
  console.log('  Error Message:', job.errorMessage || 'None');
  console.log('  Started At:', job.startedAt);
  console.log('  Completed At:', job.completedAt || 'Never');
  console.log('  Progress:', job.processedDocuments + '/' + job.totalDocuments);
  
  console.log('\n🔍 KEY FINDING:');
  console.log('The job is stuck in PROCESSING status with no error message.');
  console.log('This means markJobFailed() was never called OR it failed silently.\n');
  
  console.log('POSSIBLE ROOT CAUSES:');
  console.log('1. The processDocument() function crashed BEFORE the catch block');
  console.log('   - Likely in BackgroundJobService.analyzeSelectionCriteriaDocument()');
  console.log('   - Or in the Claude API call itself');
  console.log('');
  console.log('2. The error was thrown but not caught properly');
  console.log('   - Unhandled promise rejection in async code');
  console.log('   - Process crashed/terminated before error handling');
  console.log('');
  console.log('3. The catch block executed but markJobFailed() failed');
  console.log('   - Database connection issue when updating status');
  console.log('   - Transaction conflict or deadlock');
  
  console.log('\n📊 EVIDENCE:');
  console.log('- Job processed 1 document successfully (APPLICATION_FORM)');
  console.log('- Job failed on document 2 (SELECTION_CRITERIA)');
  console.log('- No error message was recorded');
  console.log('- Job remains in PROCESSING state after 5+ hours');
  console.log('- Background processor detects it as stuck but cannot recover');
  
  console.log('\n💡 MOST LIKELY SCENARIO:');
  console.log('The BackgroundJobService.analyzeSelectionCriteriaDocument() method');
  console.log('crashed or timed out when calling the Claude API, causing an');
  console.log('unhandled rejection that terminated the process before the');
  console.log('error could be caught and logged properly.');
  
  await prisma.$disconnect();
}

analyzeFlow().catch(console.error);
