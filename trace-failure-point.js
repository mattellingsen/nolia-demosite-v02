import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function traceFailure() {
  console.log('\n=== TRACING EXACT FAILURE POINT ===\n');
  
  const fundId = 'a0540d5e-b8df-4d44-83cc-0009a752028d';
  const jobId = '210b6560-e733-44a2-8671-7a3696aa6586';
  
  // Get the job with full details
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId },
    include: {
      fund: {
        include: {
          documents: {
            orderBy: { uploadedAt: 'asc' }
          }
        }
      }
    }
  });
  
  if (!job) {
    console.log('Job not found!');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Job Details:');
  console.log(`  Status: ${job.status}`);
  console.log(`  Started: ${job.startedAt}`);
  console.log(`  Last Update: ${job.updatedAt}`);
  console.log(`  Progress: ${job.processedDocuments}/${job.totalDocuments} documents`);
  
  const metadata = job.metadata;
  console.log('\nMetadata Analysis:');
  console.log(`  Document IDs in queue: ${metadata.documentIds ? metadata.documentIds.length : 0}`);
  console.log(`  Last processed document ID: ${metadata.lastProcessedDocument || 'None'}`);
  console.log(`  Last activity: ${metadata.lastProcessedAt || 'Unknown'}`);
  
  // Find the failed document
  if (metadata.documentIds && metadata.lastProcessedDocument) {
    const lastIndex = metadata.documentIds.indexOf(metadata.lastProcessedDocument);
    console.log(`  Last document was at index: ${lastIndex}`);
    
    if (lastIndex >= 0 && lastIndex < metadata.documentIds.length - 1) {
      const nextDocId = metadata.documentIds[lastIndex + 1];
      const nextDoc = job.fund.documents.find(d => d.id === nextDocId);
      
      if (nextDoc) {
        console.log('\n🔴 FAILED ON DOCUMENT:');
        console.log(`  ID: ${nextDoc.id}`);
        console.log(`  Filename: ${nextDoc.filename}`);
        console.log(`  Type: ${nextDoc.documentType}`);
        console.log(`  S3 Key: ${nextDoc.s3Key}`);
        console.log(`  Size: ${nextDoc.fileSize} bytes`);
        console.log(`  Mime Type: ${nextDoc.mimeType}`);
        
        // Check if this is first SELECTION_CRITERIA document
        const selectionDocs = job.fund.documents.filter(d => d.documentType === 'SELECTION_CRITERIA');
        if (selectionDocs[0]?.id === nextDoc.id) {
          console.log('\n⚠️  This is the FIRST selection criteria document!');
          console.log('  The job likely failed when trying to process multiple selection criteria documents together.');
        }
      }
    }
  }
  
  // Check timeline
  console.log('\n📅 Timeline Analysis:');
  console.log(`  Job created: ${job.createdAt}`);
  console.log(`  Job started: ${job.startedAt || 'Never'}`);
  console.log(`  Last update: ${job.updatedAt}`);
  
  if (job.startedAt) {
    const startTime = new Date(job.startedAt).getTime();
    const lastUpdate = new Date(job.updatedAt).getTime();
    const now = Date.now();
    
    console.log(`  Time from start to last update: ${Math.floor((lastUpdate - startTime) / 60000)} minutes`);
    console.log(`  Time since last update: ${Math.floor((now - lastUpdate) / 60000)} minutes`);
    console.log(`  Total time running: ${Math.floor((now - startTime) / 60000)} minutes`);
  }
  
  // Check for similar patterns in other funds
  console.log('\n🔍 Checking for Similar Patterns:');
  
  const otherJobs = await prisma.backgroundJob.findMany({
    where: {
      type: 'DOCUMENT_ANALYSIS',
      id: { not: jobId }
    },
    include: {
      fund: {
        select: {
          name: true,
          documents: {
            select: {
              documentType: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  let stuckCount = 0;
  otherJobs.forEach(otherJob => {
    if (otherJob.status === 'PROCESSING' && otherJob.processedDocuments === 1) {
      stuckCount++;
      console.log(`  ⚠️ ${otherJob.fund.name}: Also stuck after 1 document`);
    }
  });
  
  if (stuckCount === 0) {
    console.log('  ✅ No other funds show the same stuck pattern');
  }
  
  // Analyze the error pattern
  console.log('\n🎯 ROOT CAUSE HYPOTHESIS:');
  console.log('  1. The job successfully processed the APPLICATION_FORM document');
  console.log('  2. It updated progress to 1/15 documents (7%)');
  console.log('  3. When attempting to process the first SELECTION_CRITERIA document:');
  console.log('     - The processor likely crashed or timed out');
  console.log('     - No error was caught or logged');
  console.log('     - The job status was never updated to FAILED');
  console.log('  4. The job remains in PROCESSING state indefinitely');
  console.log('\n  LIKELY CAUSE: The document processor crashed while analyzing');
  console.log('  the SELECTION_CRITERIA document, possibly due to:');
  console.log('  - Claude API timeout or rate limit');
  console.log('  - Memory issue with large document (292KB)');
  console.log('  - Unhandled promise rejection in the processing code');
  
  await prisma.$disconnect();
}

traceFailure().catch(console.error);
