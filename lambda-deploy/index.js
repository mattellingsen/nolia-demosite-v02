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
        
        // Complete brain assembly immediately (simulate processing)
        await prisma.backgroundJob.update({
          where: { id: brainJob.id },
          data: {
            processedDocuments: 1,
            progress: 100,
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });
        
        console.log('Brain assembly job completed:', brainJob.id);
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