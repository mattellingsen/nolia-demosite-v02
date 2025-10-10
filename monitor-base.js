const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const baseId = process.argv[2] || 'd3cba0e6-b194-4ee7-ac2b-17815c728d77';

async function monitor() {
  const fund = await prisma.worldBankAdminFund.findUnique({
    where: { id: baseId },
    include: {
      documents: true,
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!fund) {
    console.log('❌ Fund not found:', baseId);
    return;
  }

  const job = fund.jobs[0];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 BASE STATUS:', new Date().toLocaleTimeString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Name:', fund.name);
  console.log('  Status:', fund.status);
  console.log('  Documents:', fund.documents.length);
  console.log('  Jobs:', fund.jobs.length);

  if (job) {
    console.log('  Job Status:', job.status);
    console.log('  Job Progress:', job.progress);
    console.log('  Job Updated:', job.updatedAt.toLocaleTimeString());
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
}

monitor().catch(console.error);
