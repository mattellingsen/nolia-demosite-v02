import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFunds() {
  console.log('\nSearching for recent funds...\n');

  // Get all recent funds
  const funds = await prisma.fund.findMany({
    include: {
      backgroundJobs: {
        select: {
          id: true,
          type: true,
          status: true,
          processedDocuments: true,
          totalDocuments: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          errorMessage: true
        }
      },
      documents: {
        select: {
          id: true,
          documentType: true,
          filename: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log(`Found ${funds.length} funds:\n`);

  funds.forEach(fund => {
    const docJob = fund.backgroundJobs.find(j => j.type === 'DOCUMENT_ANALYSIS');
    const ragJob = fund.backgroundJobs.find(j => j.type === 'RAG_PROCESSING');

    console.log(`ID: ${fund.id}`);
    console.log(`Name: ${fund.name}`);
    console.log(`Status: ${fund.status}`);
    console.log(`Created: ${fund.createdAt}`);
    console.log(`Documents: ${fund.documents.length}`);

    if (docJob) {
      console.log(`Doc Processing: ${docJob.status} (${docJob.processedDocuments}/${docJob.totalDocuments})`);
      if (docJob.errorMessage) console.log(`  Error: ${docJob.errorMessage}`);
    }

    if (ragJob) {
      console.log(`RAG Processing: ${ragJob.status}`);
    }

    console.log('---');
  });

  await prisma.$disconnect();
}

checkFunds().catch(console.error);
