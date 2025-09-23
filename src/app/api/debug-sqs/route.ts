import { NextRequest, NextResponse } from 'next/server';
import { SQSClient, ListQueuesCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 SQS diagnostic starting...');

        // Check environment variables
        const sqsQueueUrl = process.env.SQS_QUEUE_URL;
        const sqsDocumentProcessingQueue = process.env.SQS_DOCUMENT_PROCESSING_QUEUE;
        const awsRegion = process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2';
        const awsAccessKeyId = process.env.NOLIA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
        const awsSecretAccessKey = process.env.NOLIA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

        console.log('🔧 Environment variables check:', {
            SQS_QUEUE_URL: sqsQueueUrl ? 'SET' : 'NOT_SET',
            SQS_DOCUMENT_PROCESSING_QUEUE: sqsDocumentProcessingQueue ? 'SET' : 'NOT_SET',
            AWS_REGION: awsRegion,
            AWS_ACCESS_KEY_ID: awsAccessKeyId ? 'SET' : 'NOT_SET',
            AWS_SECRET_ACCESS_KEY: awsSecretAccessKey ? 'SET' : 'NOT_SET',
        });

        // Determine queue name/URL
        const queueIdentifier = sqsQueueUrl || sqsDocumentProcessingQueue || 'nolia-document-processing';
        console.log('🎯 Queue identifier:', queueIdentifier);

        // Create SQS client
        const sqsClient = new SQSClient({
            region: awsRegion,
            credentials: awsAccessKeyId && awsSecretAccessKey ? {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
            } : undefined,
        });

        // Test 1: List all queues
        let queuesList;
        try {
            console.log('📋 Listing all SQS queues...');
            const listCommand = new ListQueuesCommand({});
            const listResult = await sqsClient.send(listCommand);
            queuesList = listResult.QueueUrls || [];
            console.log('✅ Found queues:', queuesList);
        } catch (error) {
            console.log('❌ Failed to list queues:', error);
            queuesList = null;
        }

        // Test 2: Check if our specific queue exists
        let queueExists = false;
        let actualQueueUrl = null;

        if (queuesList) {
            // Check if queue identifier is a full URL or just a name
            if (queueIdentifier.startsWith('https://')) {
                // It's a full URL
                actualQueueUrl = queueIdentifier;
                queueExists = queuesList.includes(queueIdentifier);
            } else {
                // It's a queue name, find the matching URL
                actualQueueUrl = queuesList.find(url => url.includes(queueIdentifier));
                queueExists = !!actualQueueUrl;
            }
        }

        console.log('🔍 Queue existence check:', {
            queueIdentifier,
            queueExists,
            actualQueueUrl,
        });

        // Test 3: Get queue attributes if it exists
        let queueAttributes = null;
        if (queueExists && actualQueueUrl) {
            try {
                console.log('📊 Getting queue attributes...');
                const attributesCommand = new GetQueueAttributesCommand({
                    QueueUrl: actualQueueUrl,
                    AttributeNames: ['All'],
                });
                const attributesResult = await sqsClient.send(attributesCommand);
                queueAttributes = attributesResult.Attributes;
                console.log('✅ Queue attributes retrieved');
            } catch (error) {
                console.log('❌ Failed to get queue attributes:', error);
            }
        }

        // Determine the issue category
        let issueCategory = 'UNKNOWN';
        let troubleshooting = 'Unknown SQS issue';

        if (!awsAccessKeyId || !awsSecretAccessKey) {
            issueCategory = 'AWS_CREDENTIALS_MISSING';
            troubleshooting = 'AWS credentials not configured in Amplify environment variables';
        } else if (!queuesList) {
            issueCategory = 'SQS_ACCESS_DENIED';
            troubleshooting = 'Cannot access SQS service - check IAM permissions for AWS credentials';
        } else if (!queueExists) {
            issueCategory = 'QUEUE_NOT_FOUND';
            troubleshooting = `SQS queue '${queueIdentifier}' does not exist - needs to be created in AWS`;
        } else if (!queueAttributes) {
            issueCategory = 'QUEUE_ACCESS_DENIED';
            troubleshooting = 'Queue exists but cannot access attributes - check IAM permissions';
        } else {
            issueCategory = 'SQS_WORKING';
            troubleshooting = 'SQS queue is accessible and working correctly';
        }

        const diagnosticResult = {
            success: queueExists && !!queueAttributes,
            issueCategory,
            troubleshooting,
            environment: {
                awsRegion,
                hasAwsCredentials: !!(awsAccessKeyId && awsSecretAccessKey),
                sqsQueueUrl: sqsQueueUrl || 'NOT_SET',
                queueIdentifier,
            },
            sqsStatus: {
                canListQueues: !!queuesList,
                totalQueues: queuesList?.length || 0,
                queueExists,
                actualQueueUrl,
                hasQueueAttributes: !!queueAttributes,
            },
            availableQueues: queuesList,
            timestamp: new Date().toISOString(),
        };

        console.log('📊 SQS diagnostic result:', diagnosticResult);

        return NextResponse.json(diagnosticResult);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error('❌ SQS diagnostic failed:', {
            error: errorMessage,
            stack: errorStack,
            errorType: error?.constructor?.name || 'Unknown'
        });

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                issueCategory: 'DIAGNOSTIC_ERROR',
                troubleshooting: 'Failed to run SQS diagnostic - check logs for details',
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}