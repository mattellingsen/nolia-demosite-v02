import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTender() {
  const tender = await prisma.fund.findFirst({
    where: {
      moduleType: 'PROCUREMENT',
      name: { contains: 'MBIE' }
    },
    include: {
      documents: true,
      backgroundJobs: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!tender) {
    console.log('❌ No tender found');
    return;
  }

  console.log('📊 TENDER ANALYSIS');
  console.log('==================');
  console.log('Name:', tender.name);
  console.log('ID:', tender.id);
  console.log('Status:', tender.status);
  console.log('');

  console.log('📄 DOCUMENTS:', tender.documents.length);
  for (const doc of tender.documents) {
    console.log('  -', doc.filename, '(' + doc.documentType + ')');
  }
  console.log('');

  console.log('⚙️  BACKGROUND JOBS:', tender.backgroundJobs.length);
  for (const job of tender.backgroundJobs) {
    console.log('  Type:', job.type);
    console.log('  Status:', job.status);
    console.log('  Progress:', job.progress + '%');
    console.log('  Processed:', job.processedDocuments + '/' + job.totalDocuments);
    if (job.errorMessage) {
      console.log('  ❌ ERROR:', job.errorMessage);
    }
    console.log('');
  }

  console.log('🧠 BRAIN ANALYSIS');
  console.log('==================');
  console.log('Brain Assembled:', tender.brainAssembledAt ? 'YES (' + tender.brainAssembledAt.toISOString() + ')' : 'NO');
  console.log('Brain Version:', tender.brainVersion || 'N/A');
  console.log('OpenSearch Index:', tender.openSearchIndex || 'N/A');
  console.log('');

  console.log('📝 DOCUMENT ANALYSIS');
  console.log('==================');
  console.log('Application Form Analysis:', tender.applicationFormAnalysis ? 'EXISTS (' + JSON.stringify(tender.applicationFormAnalysis).substring(0, 100) + '...)' : 'MISSING');
  console.log('Selection Criteria Analysis:', tender.selectionCriteriaAnalysis ? 'EXISTS (' + JSON.stringify(tender.selectionCriteriaAnalysis).substring(0, 100) + '...)' : 'MISSING');
  console.log('Good Examples Analysis:', tender.goodExamplesAnalysis ? 'EXISTS (' + JSON.stringify(tender.goodExamplesAnalysis).substring(0, 100) + '...)' : 'MISSING');
  console.log('Output Templates Analysis:', tender.outputTemplatesAnalysis ? 'EXISTS (' + JSON.stringify(tender.outputTemplatesAnalysis).substring(0, 100) + '...)' : 'MISSING');

  await prisma.$disconnect();
}

checkTender();
