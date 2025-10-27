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
    CheckDone01,
    Send01
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { Badge } from "@/components/base/badges/badges";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { useWorldBankGroupProjectJobStatus } from "@/hooks/useWorldBankGroupProjects";

interface ProcessingStatus {
    projectId: string;
    projectName: string;
    projectDescription?: string;
    status: 'CREATED' | 'PROCESSING' | 'ACTIVE' | 'ERROR';
    documentsUploaded: {
        preRfpDocs: number;
        rfpDocs: number;
        supportingDocs: number;
        outputTemplates: number;
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
    analysisWarnings?: Array<{
        type: 'PRE_RFP' | 'RFP' | 'SUPPORTING' | 'TEMPLATES';
        message: string;
        requiresReview: boolean;
    }>;
}

function ProjectCreatedContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    const [status, setStatus] = useState<ProcessingStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [simulatedProgress, setSimulatedProgress] = useState(20); // Start at 20%
    const [startTime] = useState(Date.now());

    // Fetch job status from API (FAKE DEMO - always returns PROCESSING)
    const fetchJobStatus = async () => {
        if (!projectId) return;

        try {
            console.log('[WorldBankGroup FAKE DEMO] Fetching job status for project:', projectId);
            const response = await fetch(`/api/worldbankgroup-projects/${projectId}/job-status`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch job status');
            }

            console.log('[WorldBankGroup FAKE DEMO] Job status data:', data);

            // Check actual project status from API
            const isActive = data.projectStatus === 'ACTIVE';

            const statusData: ProcessingStatus = {
                projectId: data.projectId,
                projectName: data.projectName || 'Untitled Project',
                projectDescription: data.projectDescription,
                status: isActive ? 'ACTIVE' : 'PROCESSING',
                documentsUploaded: {
                    preRfpDocs: data.documentsUploaded?.preRfpFiles || 0,
                    rfpDocs: data.documentsUploaded?.rfpFiles || 0,
                    supportingDocs: data.documentsUploaded?.supportingFiles || 0,
                    outputTemplates: data.documentsUploaded?.outputTemplatesFiles || 0
                },
                documents: data.documents || [],
                brainBuilding: {
                    status: isActive ? 'COMPLETED' : 'PROCESSING',
                    progress: isActive ? 100 : 45,
                    currentTask: isActive ? 'Project knowledge base is active and ready for use' : 'Analysing compliance requirements...',
                    estimatedCompletion: isActive ? undefined : '20-30 minutes',
                    processedDocuments: isActive ? ((data.documentsUploaded?.preRfpFiles || 0) +
                                   (data.documentsUploaded?.rfpFiles || 0) +
                                   (data.documentsUploaded?.supportingFiles || 0) +
                                   (data.documentsUploaded?.outputTemplatesFiles || 0)) : 0,
                    totalDocuments: (data.documentsUploaded?.preRfpFiles || 0) +
                                   (data.documentsUploaded?.rfpFiles || 0) +
                                   (data.documentsUploaded?.supportingFiles || 0) +
                                   (data.documentsUploaded?.outputTemplatesFiles || 0)
                },
                createdAt: data.createdAt
            };

            setStatus(statusData);
            setIsLoading(false);
        } catch (err) {
            console.error('[WorldBankGroup FAKE DEMO] Error fetching job status:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setIsLoading(false);
        }
    };

    // Simulate progress: start at 20%, increase every 10 seconds by small increments
    // Simulates realistic processing that takes 20-30 minutes
    useEffect(() => {
        if (!status || status.brainBuilding.status !== 'PROCESSING') return;

        const progressInterval = setInterval(() => {
            setSimulatedProgress(prev => {
                // Gradually increase progress, slowing down as it gets higher
                // Max out at 95% to never reach 100% while processing
                if (prev >= 95) return 95;

                // Increase by smaller amounts as progress increases
                const increment = prev < 50 ? 3 : prev < 80 ? 2 : 1;
                return Math.min(95, prev + increment);
            });
        }, 10000); // Every 10 seconds

        return () => clearInterval(progressInterval);
    }, [status]);

    // Initial fetch and polling every 5 seconds
    useEffect(() => {
        fetchJobStatus();
        const interval = setInterval(fetchJobStatus, 5000);
        return () => clearInterval(interval);
    }, [projectId]);

    const getStatusColor = () => {
        return 'warning'; // Always show warning/processing color for demo
    };

    // Calculate estimated time remaining based on simulated progress
    const getEstimatedTimeRemaining = () => {
        if (!status || status.brainBuilding.status !== 'PROCESSING') return undefined;

        // Estimate based on progress: roughly 20-30 minutes total
        // If at 20%, assume 25-30 mins remaining
        // If at 50%, assume 15-20 mins remaining
        // If at 80%, assume 5-10 mins remaining
        if (simulatedProgress < 30) return '25-30 minutes';
        if (simulatedProgress < 50) return '20-25 minutes';
        if (simulatedProgress < 70) return '15-20 minutes';
        if (simulatedProgress < 85) return '10-15 minutes';
        if (simulatedProgress < 95) return '5-10 minutes';
        return '2-5 minutes';
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-tertiary">Loading project status...</div>
            </div>
        );
    }

    if (error || !status) {
        return (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-error-300 bg-error-50 p-8 text-center">
                <FeaturedIcon icon={AlertTriangle} color="error" size="lg" />
                <div>
                    <p className="font-semibold text-primary">Failed to load project status</p>
                    <p className="mt-1 text-sm text-tertiary">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
                </div>
                <Button size="sm" color="primary" onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-error-300 bg-error-50 p-8 text-center">
                <FeaturedIcon icon={AlertTriangle} color="error" size="lg" />
                <div>
                    <p className="font-semibold text-primary">Invalid project</p>
                    <p className="mt-1 text-sm text-tertiary">No project ID provided</p>
                </div>
                <Button size="sm" color="primary" href="/worldbankgroup/setup">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/worldbankgroup/setup"
                items={[
                    { label: "Setup", href: "/worldbankgroup/setup", icon: Edit05 },
                    { label: "Assess", href: "/worldbankgroup/assess", icon: CheckDone01 },
                ]}
            />
            <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12">
                <div className="px-4 lg:px-8">
                    <div className="flex flex-col gap-4">
                        <Button size="sm" color="tertiary" iconLeading={ArrowLeft} href="/worldbankgroup/setup" className="self-start [&_svg]:!text-brand-600">
                            Back to Dashboard
                        </Button>
                        <div className="flex flex-col gap-1">
                            <p className="text-md font-semibold text-tertiary">World Bank Group Project</p>
                            <p className="text-display-md font-semibold text-primary">{status.projectName}</p>
                            {status.projectDescription && (
                                <p className="text-sm text-tertiary mt-2">{status.projectDescription}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-4 lg:px-8">
                    <div className="space-y-6">
                            {/* Processing/Active Status */}
                            {status.status === 'ACTIVE' ? (
                                <div className="rounded-lg border border-success-300 bg-success-50 p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <CheckCircle className="h-6 w-6 text-success-600" />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-semibold text-success-900">
                                                        Project Active
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-sm text-success-700">
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span>Completed: {new Date(status.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <p className="mt-1 text-sm text-success-700">
                                                    {status.brainBuilding.currentTask}
                                                </p>
                                                <p className="mt-2 text-xs text-success-600">
                                                    Project-specific knowledge base has been processed and is ready for use in submission assessments.
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-success-700">Progress</span>
                                                    <span className="font-medium text-success-900">{status.brainBuilding.status === 'COMPLETED' ? 100 : simulatedProgress}%</span>
                                                </div>
                                                <ProgressBar value={status.brainBuilding.status === 'COMPLETED' ? 100 : simulatedProgress} className="h-2 [&>div]:bg-success-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
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
                                                    {getEstimatedTimeRemaining() && (
                                                        <div className="flex items-center gap-2 text-sm text-warning-700 flex-shrink-0 ml-4">
                                                            <Clock className="h-4 w-4" />
                                                            <span>Estimated time remaining: {getEstimatedTimeRemaining()}</span>
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
                                                    <span className="font-medium text-warning-900">{simulatedProgress}%</span>
                                                </div>
                                                <ProgressBar value={simulatedProgress} className="h-2 [&>div]:bg-warning-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Documents Uploaded */}
                            <div className="rounded-lg border border-secondary bg-secondary/50 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-primary">Documents Uploaded</h3>
                                    {status.status === 'ACTIVE' ? (
                                        <Button
                                            href={`/worldbankgroup/knowledge-base?projectId=${status.projectId}`}
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
                                            <p className="text-2xl font-semibold text-primary">{status.documents.length}</p>
                                        </div>
                                    </div>
                                </div>

                                {status.documents.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-sm font-medium text-primary">Uploaded Files</h4>
                                            {status.status === 'ACTIVE' && (
                                                <a href="#" className="text-sm text-brand-600 hover:text-brand-700 underline transition-colors">
                                                    edit
                                                </a>
                                            )}
                                        </div>
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
                                                        onClick={() => {}}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* What's Happening */}
                            <div className="rounded-lg border border-secondary bg-primary p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4">
                                    {status.status === 'ACTIVE' ? 'Processing Complete' : 'What\'s Happening?'}
                                </h3>
                                {status.status === 'ACTIVE' ? (
                                    <div className="space-y-3 text-sm text-tertiary">
                                        <p>✓ Documents uploaded to secure cloud storage</p>
                                        <p>✓ Documents processed and project requirements extracted</p>
                                        <p>✓ Searchable knowledge base built for compliance checking</p>
                                        <p>✓ Documents indexed and ready for quick reference</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3 text-sm text-tertiary">
                                            <p>✓ Documents have been uploaded to secure cloud storage</p>
                                            <p>⏳ Processing documents to extract project requirements and specifications</p>
                                            <p>⏳ Building searchable knowledge base for compliance checking</p>
                                            <p>⏳ Indexing documents for quick reference during assessments</p>
                                        </div>
                                        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                            <p className="text-sm text-purple-800">
                                                <strong>Status:</strong> Currently processing knowledge base. You will receive an email notification once processing completes. The knowledge base will then be available for use in submission assessments.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                    </div>
                </div>
            </main>

            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex flex-col gap-5 px-6 pt-6">
                    {status.status === 'ACTIVE' ? (
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
                                <p className="text-sm font-semibold text-primary">Project-Specific</p>
                                <p className="text-xs text-tertiary mt-1">Project-specific knowledge base</p>
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
        </div>
    );
}

export default function ProjectCreatedPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <div className="text-tertiary">Loading...</div>
            </div>
        }>
            <ProjectCreatedContent />
        </Suspense>
    );
}
