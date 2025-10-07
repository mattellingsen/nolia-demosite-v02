const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTender() {
  const tenderId = '3cfa0f1f-c3d4-46fb-abe0-77f886a49c4b';

  console.log('\n=== TENDER INVESTIGATION ===\n');

  // 1. Get tender details (using Fund model for PROCUREMENT)
  const tender = await prisma.fund.findUnique({
    where: { id: tenderId },
    include: {
      documents: true,
      backgroundJobs: true
    }
  });

  if (!tender) {
    console.log('❌ TENDER NOT FOUND');
    return;
  }

  console.log('1. TENDER DETAILS:');
  console.log('   - ID:', tender.id);
  console.log('   - Title:', tender.title);
  console.log('   - Status:', tender.status);
  console.log('   - Module:', tender.module);
  console.log('   - Created:', tender.createdAt);
  console.log('   - Documents Count:', tender.documents.length);
  console.log('   - Background Jobs Count:', tender.backgroundJobs.length);

  console.log('\n2. DOCUMENTS:');
  tender.documents.forEach((doc, i) => {
    console.log(`   Document ${i + 1}:`);
    console.log('     - ID:', doc.id);
    console.log('     - Filename:', doc.filename);
    console.log('     - S3 Key:', doc.s3Key);
    console.log('     - Size:', doc.fileSize, 'bytes');
    console.log('     - Uploaded:', doc.uploadedAt);
  });

  console.log('\n3. BACKGROUND JOBS:');
  if (tender.backgroundJobs.length === 0) {
    console.log('   ⚠️  NO BACKGROUND JOBS FOUND');
  } else {
    tender.backgroundJobs.forEach((job, i) => {
      console.log(`   Job ${i + 1}:`);
      console.log('     - ID:', job.id);
      console.log('     - Type:', job.jobType);
      console.log('     - Status:', job.status);
      console.log('     - Progress:', job.progress);
      console.log('     - Created:', job.createdAt);
      console.log('     - Started:', job.startedAt);
      console.log('     - Completed:', job.completedAt);
      console.log('     - Error:', job.error);
    });
  }

  // 4. Check for orphaned jobs
  console.log('\n4. CHECKING FOR ORPHANED JOBS:');
  const allJobs = await prisma.backgroundJob.findMany({
    where: {
      OR: [
        { fundId: tenderId },
        { metadata: {
          path: ['fundId'],
          equals: tenderId
        }}
      ]
    }
  });

  console.log('   Total jobs found (including orphaned):', allJobs.length);
  if (allJobs.length > tender.backgroundJobs.length) {
    console.log('   ⚠️  ORPHANED JOBS DETECTED');
    allJobs.forEach(job => {
      if (!tender.backgroundJobs.find(j => j.id === job.id)) {
        console.log('     - Orphaned Job ID:', job.id);
        console.log('       FundId field:', job.fundId);
        console.log('       Metadata:', JSON.stringify(job.metadata));
      }
    });
  }

  // 5. Check recent document uploads (last hour)
  console.log('\n5. RECENT DOCUMENT UPLOADS (last hour):');
  const recentDocs = await prisma.fundDocument.findMany({
    where: {
      uploadedAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000)
      }
    },
    orderBy: { uploadedAt: 'desc' },
    take: 10
  });

  recentDocs.forEach(doc => {
    console.log(`   - ${doc.filename} (FundID: ${doc.fundId}, Uploaded: ${doc.uploadedAt})`);
  });
}

debugTender()
  .catch(console.error)
  .finally(() => prisma.$disconnect());