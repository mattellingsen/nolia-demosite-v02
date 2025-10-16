// Logging to diagnose Prisma client issue
const fs = require('fs');
const path = require('path');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 LAMBDA STARTUP DIAGNOSTICS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📂 __dirname:', __dirname);
console.log('📂 process.cwd():', process.cwd());

// Check if Prisma client exists
const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma', 'client');
console.log('🔍 Checking for Prisma client at:', prismaClientPath);
console.log('📁 Prisma client exists:', fs.existsSync(prismaClientPath));

if (fs.existsSync(prismaClientPath)) {
  const files = fs.readdirSync(prismaClientPath);
  console.log('📄 Files in .prisma/client:', files.join(', '));
} else {
  console.log('❌ .prisma/client directory NOT FOUND');
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('📁 node_modules exists, checking for @prisma...');
    const prismaPath = path.join(nodeModulesPath, '@prisma');
    if (fs.existsSync(prismaPath)) {
      const prismaContents = fs.readdirSync(prismaPath);
      console.log('📁 @prisma directory contains:', prismaContents.join(', '));
    }
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

exports.handler = async (event) => {
  console.log('Lambda function started', JSON.stringify(event, null, 2));
  
  try {
    for (const record of event.Records) {
      console.log('Processing SQS record:', record.messageId);
      
      // Parse the SQS message
      const messageBody = JSON.parse(record.body);
      console.log('Message body:', messageBody);
      
      const { jobId, fundId, documentId, s3Key, documentType, filename } = messageBody;
      
      if (!jobId || !fundId) {
        console.error('Missing required fields:', { jobId, fundId });
        continue;
      }
      
      // Get the current job
      const job = await prisma.backgroundJob.findUnique({
        where: { id: jobId }
      });
      
      if (!job) {
        console.error('Job not found:', jobId);
        continue;
      }
      
      console.log('Found job:', job.id, 'Status:', job.status);
      
      // Simulate document processing
      console.log(`Processing document: ${filename} (${documentType})`);
      
      // Update progress
      const newProcessedCount = job.processedDocuments + 1;
      const progress = Math.round((newProcessedCount / job.totalDocuments) * 100);
      const isComplete = newProcessedCount >= job.totalDocuments;
      
      console.log(`Progress: ${newProcessedCount}/${job.totalDocuments} (${progress}%)`);
      
      // Update the job in database
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          processedDocuments: newProcessedCount,
          progress: progress,
          status: isComplete ? 'COMPLETED' : 'PROCESSING',
          completedAt: isComplete ? new Date() : null,
          startedAt: job.startedAt || new Date()
        }
      });
      
      console.log(`Updated job ${jobId}: ${progress}% complete`);
      
      // If this is the last document, trigger brain assembly
      if (isComplete && job.type === 'DOCUMENT_ANALYSIS') {
        console.log('Document analysis complete, triggering brain assembly...');
        
        // Create brain assembly job
        const brainJob = await prisma.backgroundJob.create({
          data: {
            fundId: fundId,
            type: 'RAG_PROCESSING',
            status: 'PROCESSING',
            totalDocuments: 1,
            processedDocuments: 0,
            progress: 0,
            startedAt: new Date(),
            metadata: {
              triggerType: 'DOCUMENT_COMPLETE',
              parentJobId: jobId
            }
          }
        });
        
        console.log('Created brain assembly job:', brainJob.id);

        // Trigger actual RAG processing via API endpoint
        console.log('Calling /api/jobs/process to start RAG processing...');

        const apiUrl = 'https://staging.d2l8hlr3sei3te.amplifyapp.com/api/jobs/process';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId: brainJob.id,
            autoTrigger: true,
            source: 'lambda-document-complete'
          })
        });

        if (response.ok) {
          console.log('✅ Successfully triggered RAG processing for job:', brainJob.id);
        } else {
          console.error('❌ Failed to trigger RAG processing:', response.status, await response.text());
        }
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully processed messages' })
    };
    
  } catch (error) {
    console.error('Lambda function error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};