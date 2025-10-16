const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    const jobs = await prisma.backgroundJob.findMany({
      where: { fundId: 'b3544d5e-0530-4514-8866-9f88004f8cb6' },
      orderBy: { createdAt: 'desc' }
    });

    console.log(JSON.stringify(jobs.map(j => ({
      id: j.id,
      type: j.type,
      status: j.status,
      progress: j.progress,
      processed: j.processedDocuments,
      total: j.totalDocuments,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      errorMessage: j.errorMessage
    })), null, 2));

    await prisma.$disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
