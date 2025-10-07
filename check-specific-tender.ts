import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTender() {
  const tenderId = 'e37ed765-6a57-42ff-a228-a34bcf1973e0';

  const tender = await prisma.fund.findUnique({
    where: { id: tenderId },
    include: {
      documents: true,
      backgroundJobs: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!tender) {
    console.log('❌ Tender not found');
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
    if (job.startedAt) console.log('  Started:', job.startedAt.toISOString());
    if (job.completedAt) console.log('  Completed:', job.completedAt.toISOString());
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
  const analyses = {
    'Application Form': tender.applicationFormAnalysis,
    'Selection Criteria': tender.selectionCriteriaAnalysis,
    'Good Examples': tender.goodExamplesAnalysis,
    'Output Templates': tender.outputTemplatesAnalysis
  };

  for (const [name, data] of Object.entries(analyses)) {
    if (data) {
      const str = JSON.stringify(data);
      console.log(`${name}: EXISTS (${str.length} chars, preview: ${str.substring(0, 150)}...)`);
    } else {
      console.log(`${name}: MISSING`);
    }
  }

  await prisma.$disconnect();
}

checkTender();
