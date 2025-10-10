const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function checkBase() {
  const baseId = '102bd6ed-729a-411c-b5ca-c8c3f98762ef';
  
  const fund = await prisma.fund.findUnique({
    where: { id: baseId },
    include: {
      documents: true,
      backgroundJobs: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  
  if (!fund) {
    console.log('Fund not found');
    return;
  }
  
  console.log('\n📊 BASE STATUS:');
  console.log('  Name:', fund.name);
  console.log('  Status:', fund.status);
  console.log('  Documents:', fund.documents.length);
  console.log('  Jobs:', fund.backgroundJobs.length);
  
  if (fund.documents.length > 0) {
    console.log('\n📄 DOCUMENTS:');
    fund.documents.forEach(d => console.log('  -', d.filename));
  }
  
  if (fund.backgroundJobs.length > 0) {
    console.log('\n📋 JOBS:');
    fund.backgroundJobs.forEach(j => {
      console.log('  - Job:', j.id);
      console.log('    Status:', j.status);
      console.log('    Error:', j.errorMessage || 'None');
    });
  }
  
  await prisma.$disconnect();
}

checkBase();
