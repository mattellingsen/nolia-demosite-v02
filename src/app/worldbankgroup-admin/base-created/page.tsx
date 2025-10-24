"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    CheckCircle,
    Clock,
    ArrowLeft,
    FileCheck02,
    Shield01,
    File02,
    BookOpen01,
    Flash,
    AlertTriangle,
    RefreshCw05,
    ArrowRight,
    Edit05,
    Settings01,
    Building02,
    Database02,
    XClose
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { Badge } from "@/components/base/badges/badges";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

// Disable static generation
export const dynamic = 'force-dynamic';

interface ProcessingStatus {
    baseId: string;
    baseName: string;
    baseDescription?: string;
    status: 'CREATED' | 'PROCESSING' | 'ACTIVE' | 'ERROR';
    documentsUploaded: {
        policies: number;
        complianceDocs: number;
        standardTemplates: number;
        governanceRules: number;
    };
    documents: Array<{
        id: string;
        filename: string;
        fileSize: number;
        mimeType: string;
        documentType: string;
        uploadedAt: string;
    }>;
    brainBuilding: {
        status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
        progress: number;
        currentTask?: string;
        estimatedCompletion?: string;
        processedDocuments?: number;
        totalDocuments?: number;
        errorMessage?: string;
    };
    createdAt: string;
}

function BaseCreatedContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const baseId = searchParams.get('baseId');

    const [status, setStatus] = useState<ProcessingStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch job status from API (FAKE DEMO - always returns PROCESSING)
    const fetchJobStatus = async () => {
        if (!baseId) return;

        try {
            console.log('[WorldBankGroup FAKE DEMO] Fetching job status for base:', baseId);
            const response = await fetch(`/api/worldbankgroup-base/${baseId}/job-status`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch job status');
            }

            console.log('[WorldBankGroup FAKE DEMO] Job status data:', data);

            // Use the actual status from API (which detects the special baseId)
            const statusData: ProcessingStatus = {
                baseId: data.baseId,
                baseName: data.baseName,
                baseDescription: data.baseDescription,
                status: data.baseStatus || data.status || 'PROCESSING',
                documentsUploaded: data.documentsUploaded,
                documents: data.documents,
                brainBuilding: data.brainBuilding || {
                    status: 'PROCESSING',
                    progress: 45,
                    currentTask: 'Analysing compliance requirements...',
                    estimatedCompletion: '20-30 minutes',
                    processedDocuments: 0,
                    totalDocuments: data.documentsUploaded.policies +
                                   data.documentsUploaded.complianceDocs +
                                   data.documentsUploaded.standardTemplates +
                                   data.documentsUploaded.governanceRules,
                },
                createdAt: data.createdAt
            };

            // Add 1-second delay to give feeling of loading when navigating back
            await new Promise(resolve => setTimeout(resolve, 1000));

            setStatus(statusData);
            setIsLoading(false);
        } catch (err) {
            console.error('[WorldBankGroup] Error fetching job status:', err);
            setError(err instanceof Error ? err.message : 'Failed to load status');
            setIsLoading(false);
        }
    };

    const handleDeleteDocument = async (documentId: string) => {
        if (!documentId) return;

        setIsDeleting(true);
        try {
            // FAKE DEMO: In production, this would call an API endpoint
            // await fetch(`/api/worldbankgroup-base/${baseId}/documents/${documentId}`, { method: 'DELETE' });

            // For demo, just remove from local state
            if (status) {
                const updatedDocuments = status.documents.filter(doc => doc.id !== documentId);
                setStatus({
                    ...status,
                    documents: updatedDocuments
                });
            }

            setDocumentToDelete(null);
        } catch (err) {
            console.error('[WorldBankGroup] Error deleting document:', err);
            alert('Failed to delete document. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (!baseId) {
            setError('No base ID provided');
            setIsLoading(false);
            return;
        }

        fetchJobStatus();

        // FAKE DEMO: Poll every 5 seconds to show continuous "processing"
        const interval = setInterval(fetchJobStatus, 5000);

        return () => clearInterval(interval);
    }, [baseId]);

    if (!baseId) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <p className="text-error-600">No base ID provided</p>
                    <Button href="/worldbankgroup-admin/setup" className="mt-4">
                        Back to Setup
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <LoadingIndicator type="line-spinner" size="md" />
                    <p className="mt-4 text-tertiary">Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="max-w-md text-center">
                    <FeaturedIcon icon={AlertTriangle} color="error" size="lg" className="mx-auto" />
                    <p className="mt-4 font-semibold text-primary">{error}</p>
                    <Button href="/worldbankgroup-admin/setup" className="mt-4">
                        Back to Setup
                    </Button>
                </div>
            </div>
        );
    }

    if (!status) {
        return null;
    }

    const totalDocs = status.documentsUploaded.policies +
                     status.documentsUploaded.complianceDocs +
                     status.documentsUploaded.standardTemplates +
                     status.documentsUploaded.governanceRules;

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/worldbankgroup-admin/setup"
                items={[
                    {
                        label: "Setup",
                        href: "/worldbankgroup-admin/setup",
                        icon: Edit05,
                    },
                ]}
            />

            <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12">
                {/* Header */}
                <div className="px-4 lg:px-8">
                    <div className="flex flex-col gap-4">
                        <Button
                            size="sm"
                            color="tertiary"
                            iconLeading={ArrowLeft}
                            href="/worldbankgroup-admin/setup"
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back to Setup
                        </Button>
                        <div className="flex flex-col gap-1">
                            <p className="text-md font-semibold text-tertiary">WorldBankGroup Admin</p>
                            <p className="text-display-md font-semibold text-primary">{status.baseName}</p>
                            {status.baseDescription && (
                                <p className="text-sm text-tertiary mt-2">{status.baseDescription}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Processing/Active Status Card */}
                <div className="px-4 lg:px-8">
                    {status.brainBuilding.status === 'COMPLETED' ? (
                        // Active/Completed State
                        <div className="rounded-lg border border-success-300 bg-success-50 p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <CheckCircle className="h-6 w-6 text-success-600" />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-success-900">
                                                Knowledge Base Active
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-success-700 flex-shrink-0 ml-4">
                                                <CheckCircle className="h-4 w-4" />
                                                <span>Completed: {new Date(status.brainBuilding.completedAt || new Date()).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-sm text-success-700">
                                            {status.brainBuilding.currentTask}
                                        </p>
                                        <p className="mt-2 text-xs text-success-600">
                                            This knowledge base has been processed and is ready for use in project assessments.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-success-700">Progress</span>
                                            <span className="font-medium text-success-900">{status.brainBuilding.progress}%</span>
                                        </div>
                                        <ProgressBar value={status.brainBuilding.progress} className="h-2 [&>div]:bg-success-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Processing State
                        <div className="rounded-lg border border-warning-300 bg-warning-50 p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <div className="text-warning-600 [&_svg]:text-warning-600 [&_svg_.stroke-fg-brand-primary]:stroke-warning-600">
                                        <LoadingIndicator type="line-spinner" size="sm" />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-warning-900">
                                                Processing Knowledgebase
                                            </h3>
                                            {status.brainBuilding.estimatedCompletion && (
                                                <div className="flex items-center gap-2 text-sm text-warning-700 flex-shrink-0 ml-4">
                                                    <Clock className="h-4 w-4" />
                                                    <span>Estimated time remaining: {status.brainBuilding.estimatedCompletion}</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-warning-700">
                                            {status.brainBuilding.currentTask}
                                        </p>
                                        <p className="mt-2 text-xs text-warning-600">
                                            <strong>Note:</strong> Processing typically takes 20-30 minutes.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-warning-700">Progress</span>
                                            <span className="font-medium text-warning-900">{status.brainBuilding.progress}%</span>
                                        </div>
                                        <ProgressBar value={status.brainBuilding.progress} className="h-2 [&>div]:bg-warning-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Documents Overview */}
                <div className="px-4 lg:px-8">
                    <div className="rounded-lg border border-secondary bg-secondary/50 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-primary">Documents Uploaded</h3>
                            {status.brainBuilding.status === 'COMPLETED' ? (
                                <Button
                                    href={`/worldbankgroup-admin/knowledge-base?baseId=${status.baseId}`}
                                    color="secondary"
                                    size="md"
                                    iconLeading={BookOpen01}
                                >
                                    View Knowledge Base
                                </Button>
                            ) : (
                                <Button
                                    color="secondary"
                                    size="md"
                                    iconLeading={BookOpen01}
                                    isDisabled={true}
                                >
                                    View Knowledge Base
                                </Button>
                            )}
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center gap-3">
                                <FeaturedIcon icon={FileCheck02} color="gray" size="md" />
                                <div>
                                    <p className="text-sm font-medium text-primary">Total Documents</p>
                                    <p className="text-2xl font-semibold text-primary">{totalDocs}</p>
                                </div>
                            </div>
                        </div>

                        {status.documents.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-primary">Uploaded Files</h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {status.documents.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-secondary bg-primary p-3">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <File02 className="h-5 w-5 text-tertiary flex-shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-primary truncate">{doc.filename}</p>
                                                    <p className="text-xs text-tertiary">
                                                        {(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.uploadedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                color="tertiary"
                                                onClick={() => setDocumentToDelete(doc.id)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Next Steps */}
                <div className="px-4 lg:px-8">
                    <div className="rounded-lg border border-secondary bg-primary p-6">
                        <h3 className="text-lg font-semibold text-primary mb-4">
                            {status.brainBuilding.status === 'COMPLETED' ? 'Processing Complete' : "What's Happening?"}
                        </h3>
                        {status.brainBuilding.status === 'COMPLETED' ? (
                            <div className="space-y-3 text-sm text-tertiary">
                                <p>✓ Documents uploaded to secure cloud storage</p>
                                <p>✓ Documents processed and procurement rules extracted</p>
                                <p>✓ Searchable knowledge base built for compliance checking</p>
                                <p>✓ Documents indexed and ready for quick reference</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 text-sm text-tertiary">
                                    <p>✓ Documents have been uploaded to secure cloud storage</p>
                                    <p>⏳ Processing documents to extract procurement rules and policies</p>
                                    <p>⏳ Building searchable knowledge base for compliance checking</p>
                                    <p>⏳ Indexing documents for quick reference during assessments</p>
                                </div>
                                <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <p className="text-sm text-purple-800">
                                        <strong>Status:</strong> Currently processing knowledge base. You will receive an email notification once processing completes. The knowledge base will then be available for use in project set up.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex flex-col gap-5 px-6 pt-6">
                    {status.brainBuilding.status === 'COMPLETED' ? (
                        <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                            <p className="text-sm text-success-800">
                                <span className="font-semibold">Status: Active</span> — This knowledge base has been successfully
                                processed and is ready for use in project assessments.
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-sm text-purple-800">
                                <span className="font-semibold">Processing Timeline:</span> Knowledge base creation typically
                                takes 20-30 minutes depending on the number and size of documents uploaded.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Building02} color="gray" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Organisation-Wide</p>
                                <p className="text-xs text-tertiary mt-1">This knowledge base will be available for all projects</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Shield01} color="success" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Secure Processing</p>
                                <p className="text-xs text-tertiary mt-1">All documents are encrypted and processed securely</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {documentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-primary rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <FeaturedIcon icon={AlertTriangle} color="warning" size="lg" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-primary mb-2">
                                    Remove Document?
                                </h3>
                                <p className="text-sm text-tertiary mb-6">
                                    Are you really sure you want to remove this document? This will mean you'll need to re-process your knowledge base.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <Button
                                        size="md"
                                        color="tertiary"
                                        onClick={() => setDocumentToDelete(null)}
                                        disabled={isDeleting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="md"
                                        color="primary"
                                        onClick={() => handleDeleteDocument(documentToDelete)}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Removing...' : 'Yes'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BaseCreatedPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <RefreshCw05 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        }>
            <BaseCreatedContent />
        </Suspense>
    );
}
