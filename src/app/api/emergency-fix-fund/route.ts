import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';
import { storeDocumentVector } from '@/lib/aws-opensearch';

export async function POST(request: NextRequest) {
    try {
        const { fundId } = await request.json();

        if (!fundId) {
            return NextResponse.json(
                { error: 'Fund ID is required' },
                { status: 400 }
            );
        }

        console.log('🚨 Emergency fund fix starting for:', fundId);

        // Get the fund and its documents
        const fund = await prisma.fund.findUnique({
            where: { id: fundId },
            include: { documents: true }
        });

        if (!fund) {
            return NextResponse.json(
                { error: 'Fund not found' },
                { status: 404 }
            );
        }

        console.log('📋 Found fund:', fund.name, 'with', fund.documents.length, 'documents');

        // Check if fund needs processing (either PROCESSING or ACTIVE with no knowledge base)
        const needsProcessing = fund.status === 'PROCESSING' ||
                               (fund.status === 'ACTIVE' && (!fund.knowledgeBaseAnalysis ||
                                fund.knowledgeBaseAnalysis?.processedSuccessfully === 0));

        if (!needsProcessing) {
            return NextResponse.json(
                {
                    error: 'Fund does not need emergency processing',
                    currentStatus: fund.status,
                    knowledgeBase: fund.knowledgeBaseAnalysis
                },
                { status: 400 }
            );
        }

        // Step 1: Process documents with RAG database
        console.log('📄 Processing documents through RAG database...');

        const processedDocuments = [];
        for (const doc of fund.documents) {
            try {
                console.log(`Processing document: ${doc.filename} (${doc.type})`);

                // Add document to OpenSearch RAG database
                if (doc.extractedText) {
                    await storeDocumentVector(
                        fund.id,
                        doc.id,
                        doc.extractedText,
                        {
                            filename: doc.filename,
                            type: doc.type,
                            uploadedAt: doc.uploadedAt.toISOString()
                        }
                    );
                }

                processedDocuments.push({
                    id: doc.id,
                    filename: doc.filename,
                    type: doc.type,
                    status: 'processed'
                });

                console.log(`✅ Successfully processed: ${doc.filename}`);
            } catch (error) {
                console.error(`❌ Failed to process document ${doc.filename}:`, error);
                processedDocuments.push({
                    id: doc.id,
                    filename: doc.filename,
                    type: doc.type,
                    status: 'failed',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Step 2: Build knowledge base analysis
        console.log('🧠 Building knowledge base analysis...');

        const successfulDocs = processedDocuments.filter(doc => doc.status === 'processed');
        const failedDocs = processedDocuments.filter(doc => doc.status === 'failed');

        const knowledgeBaseAnalysis = {
            totalDocuments: fund.documents.length,
            processedSuccessfully: successfulDocs.length,
            failed: failedDocs.length,
            documentTypes: fund.documents.reduce((acc, doc) => {
                acc[doc.type] = (acc[doc.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            readyForAssessment: successfulDocs.length > 0
        };

        // Step 3: Update fund with knowledge base analysis
        console.log('🔄 Updating fund with knowledge base analysis...');

        const updatedFund = await prisma.fund.update({
            where: { id: fundId },
            data: {
                status: fund.status === 'PROCESSING' ? 'ACTIVE' : fund.status, // Keep ACTIVE if already ACTIVE
                knowledgeBaseAnalysis: knowledgeBaseAnalysis,
                processedAt: new Date(),
                updatedAt: new Date()
            }
        });

        // Step 4: Mark any background jobs as completed
        console.log('✅ Marking background jobs as completed...');

        await prisma.backgroundJob.updateMany({
            where: {
                entityId: fundId,
                status: { in: ['PENDING', 'RUNNING'] }
            },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                result: {
                    manuallyFixed: true,
                    fixedAt: new Date().toISOString(),
                    processedDocuments: successfulDocs.length,
                    failedDocuments: failedDocs.length
                }
            }
        });

        console.log('🎉 Emergency fund fix completed successfully!');

        return NextResponse.json({
            success: true,
            message: 'Fund processing completed successfully',
            fund: {
                id: updatedFund.id,
                name: updatedFund.name,
                status: updatedFund.status,
                processedAt: updatedFund.processedAt
            },
            processing: {
                totalDocuments: fund.documents.length,
                processed: successfulDocs.length,
                failed: failedDocs.length,
                knowledgeBaseReady: successfulDocs.length > 0
            },
            processedDocuments,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error('❌ Emergency fund fix failed:', {
            error: errorMessage,
            stack: errorStack
        });

        return NextResponse.json(
            {
                success: false,
                error: 'Emergency fund fix failed',
                details: errorMessage,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}