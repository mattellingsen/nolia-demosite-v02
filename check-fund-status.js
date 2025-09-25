const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateFund() {
  const fundId = '282aca4d-4cd5-41d2-871a-a5d60e48cc0f';
  
  console.log('=== INVESTIGATING FUND 282aca4d-4cd5-41d2-871a-a5d60e48cc0f ===\n');
  
  // Get fund details
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
    include: {
      documents: {
        orderBy: { createdAt: 'asc' }
      },
      _count: {
        select: { documents: true }
      }
    }
  });
  
  console.log('Fund Details:');
  console.log('- Name:', fund.name);
  console.log('- Status:', fund.status);
  console.log('- Processing Status:', fund.processingStatus);
  console.log('- Created:', fund.createdAt);
  console.log('- Updated:', fund.updatedAt);
  console.log('- Total Documents:', fund._count.documents);
  console.log('- Documents Processed:', fund.documentsProcessed || 0);
  console.log('- Processing Started:', fund.processingStartedAt);
  console.log('- Processing Completed:', fund.processingCompletedAt);
  console.log('- Error:', fund.error);
  
  console.log('\n=== DOCUMENT PROCESSING STATUS ===\n');
  fund.documents.forEach((doc, index) => {
    console.log(`Document ${index + 1}:`);
    console.log('  - ID:', doc.id);
    console.log('  - Name:', doc.name);
    console.log('  - Type:', doc.type);
    console.log('  - Processing Status:', doc.processingStatus);
    console.log('  - Created:', doc.createdAt);
    console.log('  - Updated:', doc.updatedAt);
    if (doc.error) console.log('  - Error:', doc.error);
    console.log('');
  });
  
  // Check background jobs
  console.log('=== BACKGROUND JOB STATUS ===\n');
  const jobs = await prisma.backgroundJob.findMany({
    where: { 
      OR: [
        { resourceId: fundId },
        { metadata: { path: '$.fundId', equals: fundId } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
  
  jobs.forEach((job, index) => {
    console.log(`Job ${index + 1}:`);
    console.log('  - ID:', job.id);
    console.log('  - Type:', job.type);
    console.log('  - Status:', job.status);
    console.log('  - Attempts:', job.attempts);
    console.log('  - Created:', job.createdAt);
    console.log('  - Updated:', job.updatedAt);
    console.log('  - Started:', job.startedAt);
    console.log('  - Completed:', job.completedAt);
    console.log('  - Failed:', job.failedAt);
    if (job.error) console.log('  - Error:', job.error);
    if (job.metadata) console.log('  - Metadata:', JSON.stringify(job.metadata, null, 2));
    console.log('');
  });
  
  // Check for other funds with similar issues
  console.log('=== OTHER STUCK FUNDS ===\n');
  const stuckFunds = await prisma.fund.findMany({
    where: {
      processingStatus: 'PROCESSING',
      createdAt: {
        lt: new Date(Date.now() - 30 * 60 * 1000) // More than 30 minutes old
      }
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      documentsProcessed: true,
      _count: {
        select: { documents: true }
      }
    }
  });
  
  stuckFunds.forEach(f => {
    console.log(`${f.name}:`);
    console.log('  - ID:', f.id);
    console.log('  - Created:', f.createdAt);
    console.log('  - Last Updated:', f.updatedAt);
    console.log('  - Documents Processed:', f.documentsProcessed || 0, '/', f._count.documents);
    console.log('');
  });
  
  await prisma.$disconnect();
}

investigateFund().catch(console.error);
