const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function checkBase() {
  const baseId = 'b5727e26-3038-44f8-826a-aee732e118ad';
  
  const fund = await prisma.fund.findUnique({
    where: { id: baseId },
    include: {
      documents: { select: { id: true, filename: true, s3Key: true, documentType: true } },
      backgroundJobs: { 
        select: { 
          id: true, 
          type: true, 
          status: true, 
          progress: true, 
          errorMessage: true,
          createdAt: true,
          metadata: true
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  
  if (!fund) {
    console.log('Fund not found');
    return;
  }
  
  console.log('\nFUND DETAILS:');
  console.log('  ID:', fund.id);
  console.log('  Name:', fund.name);
  console.log('  Status:', fund.status);
  console.log('  Documents:', fund.documents.length);
  console.log('  Background Jobs:', fund.backgroundJobs.length);
  console.log('\nDOCUMENTS:');
  fund.documents.forEach(d => {
    console.log('  -', d.filename, '(' + d.documentType + ')');
    console.log('    S3 Key:', d.s3Key);
  });
  console.log('\nBACKGROUND JOBS:');
  fund.backgroundJobs.forEach(j => {
    console.log('  - Job', j.id);
    console.log('    Type:', j.type);
    console.log('    Status:', j.status);
    console.log('    Progress:', j.progress + '%');
    console.log('    Created:', j.createdAt.toISOString());
    if (j.errorMessage) {
      console.log('    Error:', j.errorMessage);
    }
    if (j.metadata) {
      console.log('    Metadata:', JSON.stringify(j.metadata, null, 2));
    }
  });
  
  await prisma.$disconnect();
}

checkBase();
