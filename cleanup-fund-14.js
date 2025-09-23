const { PrismaClient } = require('@prisma/client');
const { S3Client, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();

// S3 client configuration
const s3Client = new S3Client({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  ...(process.env.NODE_ENV === 'development' &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {}),
});

const S3_BUCKET = process.env.S3_BUCKET_DOCUMENTS || 'nolia-funding-documents-ap-southeast-2-599065966827';

async function cleanup() {
  try {
    console.log('🔍 Looking for "Student Experience Grant 14"...');

    // Find the fund
    const fund = await prisma.fund.findFirst({
      where: {
        name: {
          contains: 'Student Experience Grant 14',
          mode: 'insensitive'
        }
      },
      include: {
        documents: true
      }
    });

    if (!fund) {
      console.log('❌ Fund "Student Experience Grant 14" not found');
      return;
    }

    console.log(`✅ Found fund: ${fund.name} (ID: ${fund.id})`);
    console.log(`📄 Documents found: ${fund.documents.length}`);

    // Delete S3 files
    for (const doc of fund.documents) {
      try {
        console.log(`🗑️ Deleting S3 file: ${doc.s3Key}`);
        await s3Client.send(new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: doc.s3Key
        }));
        console.log(`✅ Deleted S3 file: ${doc.s3Key}`);
      } catch (s3Error) {
        console.log(`⚠️ S3 file might not exist: ${doc.s3Key}`, s3Error.message);
      }
    }

    // Find and delete background jobs
    const backgroundJobs = await prisma.backgroundJob.findMany({
      where: {
        fundId: fund.id
      }
    });

    console.log(`🔄 Background jobs found: ${backgroundJobs.length}`);

    for (const job of backgroundJobs) {
      console.log(`🗑️ Deleting background job: ${job.id} (status: ${job.status})`);
      await prisma.backgroundJob.delete({
        where: { id: job.id }
      });
      console.log(`✅ Deleted background job: ${job.id}`);
    }

    // Delete fund documents
    const deletedDocs = await prisma.fundDocument.deleteMany({
      where: { fundId: fund.id }
    });
    console.log(`✅ Deleted ${deletedDocs.count} fund documents from database`);

    // Delete the fund
    await prisma.fund.delete({
      where: { id: fund.id }
    });
    console.log(`✅ Deleted fund: ${fund.name}`);

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Fund deleted: ${fund.name}`);
    console.log(`   - Documents deleted: ${fund.documents.length}`);
    console.log(`   - Background jobs deleted: ${backgroundJobs.length}`);
    console.log(`   - S3 files cleaned up: ${fund.documents.length}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();