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

    // Fetch real job status from API
    const fetchJobStatus = async () => {
        if (!projectId) return;

        try {
            const response = await fetch(`/api/worldbank-projects/${projectId}/job-status`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch job status');
            }

            // Get both job types to calculate overall progress
            const docAnalysisJob = data.jobs?.find((job: any) => job.type === 'DOCUMENT_ANALYSIS');
            const ragJob = data.jobs?.find((job: any) => job.type === 'RAG_PROCESSING');

            // Calculate multi-phase progress (Upload: 20%, Analysis: 40%, RAG: 40%)
            const calculateOverallProgress = (): number => {
                // Phase 1: Documents uploaded (20%)
                const uploadProgress = data.jobs?.length > 0 ? 20 : 0;

                // Phase 2: Document Analysis (20-60%, contributes 40%)
                let analysisProgress = 0;
                if (docAnalysisJob?.status === 'COMPLETED') {
                    analysisProgress = 40;
                } else if (docAnalysisJob?.status === 'PROCESSING') {
                    const docProgress = docAnalysisJob.processedDocuments && docAnalysisJob.totalDocuments
                        ? (docAnalysisJob.processedDocuments / docAnalysisJob.totalDocuments)
                        : 0;
                    analysisProgress = docProgress * 40;
                }

                // Phase 3: RAG Processing (60-100%, contributes 40%)
                let ragProgress = 0;
                if (ragJob?.status === 'COMPLETED') {
                    ragProgress = 40;
                } else if (ragJob?.status === 'PROCESSING') {
                    const ragPercent = ragJob.progress || 0;
                    ragProgress = (ragPercent / 100) * 40;
                }

                return Math.round(uploadProgress + analysisProgress + ragProgress);
            };

            // Determine current phase and task message
            const getCurrentPhase = (): { task: string; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' } => {
                if (docAnalysisJob?.status === 'FAILED') {
                    return { task: 'Document analysis failed', status: 'FAILED' };
                }
                if (ragJob?.status === 'FAILED') {
                    return { task: 'Knowledge base building failed', status: 'FAILED' };
                }

                if (ragJob?.status === 'COMPLETED') {
                    return { task: 'Project knowledgebase completed', status: 'COMPLETED' };
                }
                if (ragJob?.status === 'PROCESSING') {
                    const processed = ragJob.processedDocuments || 0;
                    const total = ragJob.totalDocuments || 0;
                    return {
                        task: `Building project knowledgebase... (${processed}/${total} documents)`,
                        status: 'PROCESSING'
                    };
                }

                if (docAnalysisJob?.status === 'COMPLETED') {
                    return { task: 'Documents analyzed, starting knowledgebase...', status: 'PROCESSING' };
                }
                if (docAnalysisJob?.status === 'PROCESSING') {
                    const processed = docAnalysisJob.processedDocuments || 0;
                    const total = docAnalysisJob.totalDocuments || 0;
                    return {
                        task: `Analyzing project documents... (${processed}/${total} processed)`,
                        status: 'PROCESSING'
                    };
                }

                // Phase 1: Upload complete, waiting for analysis
                if (data.jobs?.length > 0) {
                    return { task: 'Documents uploaded successfully, preparing analysis...', status: 'PROCESSING' };
                }

                // Initial state
                return { task: 'Waiting to start...', status: 'PENDING' };
            };

            const currentPhase = getCurrentPhase();
            const overallProgress = calculateOverallProgress();
            const errorMessage = docAnalysisJob?.errorMessage || ragJob?.errorMessage;

            const mappedStatus: ProcessingStatus = {
                projectId: data.projectId,
                projectName: data.projectName || 'Untitled Project',
                projectDescription: data.projectDescription,
                status: mapProjectStatus(data.projectStatus, data.overallStatus),
                documentsUploaded: data.documentsUploaded,
                documents: data.documents || [],
                brainBuilding: {
                    status: currentPhase.status,
                    progress: overallProgress,
                    currentTask: currentPhase.task,
                    estimatedCompletion: ragJob?.estimatedCompletion,
                    processedDocuments: ragJob?.processedDocuments || docAnalysisJob?.processedDocuments,
                    totalDocuments: ragJob?.totalDocuments || docAnalysisJob?.totalDocuments,
                    errorMessage: errorMessage
                },
                createdAt: data.createdAt
            };

            setStatus(mappedStatus);
            setError(null);
        } catch (err) {
            console.error('Error fetching job status:', err);
            setError(err instanceof Error ? err.message : 'Failed to load job status');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchJobStatus();

        const interval = setInterval(() => {
            if (status?.brainBuilding.status === 'PROCESSING') {
                fetchJobStatus();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [projectId, status?.brainBuilding.status]);

    const mapProjectStatus = (projectStatus: string, overallStatus: string): 'CREATED' | 'PROCESSING' | 'ACTIVE' | 'ERROR' => {
        if (overallStatus === 'failed') return 'ERROR';
        if (overallStatus === 'completed') return 'ACTIVE';
        if (overallStatus === 'processing') return 'PROCESSING';
        return 'CREATED';
    };

    const getStatusColor = () => {
        if (!status) return 'gray';
        switch (status.brainBuilding.status) {
            case 'COMPLETED': return 'success';
            case 'FAILED': return 'error';
            case 'PROCESSING': return 'warning';
            default: return 'gray';
        }
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
                    <p className="mt-1 text-sm text-tertiary">{error || 'Unknown error occurred'}</p>
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
                <Button size="sm" color="primary" href="/worldbank/setup">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/worldbank/setup"
                items={[
                    { label: "Setup", href: "/worldbank/setup", icon: Edit05 },
                    { label: "Apply", href: "/worldbank/apply", icon: Send01 },
                    { label: "Assess", href: "/worldbank/assess", icon: CheckDone01 },
                    { label: "Settings", href: "/worldbank/settings", icon: Settings01 },
                ]}
            />
            <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12">
                <div className="px-4 lg:px-8">
                    <div className="flex flex-col gap-4">
                        <Button size="sm" color="tertiary" iconLeading={ArrowLeft} href="/worldbank/setup" className="self-start [&_svg]:!text-brand-600">
                            Back to Dashboard
                        </Button>
                        <div className="flex flex-col gap-1">
                            <p className="text-md font-semibold text-tertiary">World Bank Project</p>
                            <p className="text-display-md font-semibold text-primary">{status.projectName}</p>
                            {status.projectDescription && (
                                <p className="text-md text-tertiary mt-2">{status.projectDescription}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-4 lg:px-8">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="rounded-lg border border-secondary bg-primary p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">Project Configuration Status</h3>
                                        <p className="text-sm text-tertiary mt-1">Building your project-specific project knowledgebase</p>
                                    </div>
                                    <Badge color={getStatusColor()}>{status.brainBuilding.status}</Badge>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-primary">{status.brainBuilding.currentTask}</p>
                                            <span className="text-sm text-tertiary">{status.brainBuilding.progress}%</span>
                                        </div>
                                        <ProgressBar value={status.brainBuilding.progress} />
                                        {status.brainBuilding.estimatedCompletion && status.brainBuilding.status === 'PROCESSING' && (
                                            <p className="text-xs text-tertiary mt-2">Estimated completion: {status.brainBuilding.estimatedCompletion}</p>
                                        )}
                                        {status.brainBuilding.status === 'FAILED' && status.brainBuilding.errorMessage && (
                                            <div className="mt-2 text-xs text-error-600">Error: {status.brainBuilding.errorMessage}</div>
                                        )}
                                        {status.brainBuilding.processedDocuments !== undefined && status.brainBuilding.totalDocuments !== undefined && (
                                            <p className="text-xs text-tertiary mt-2">Processed {status.brainBuilding.processedDocuments} of {status.brainBuilding.totalDocuments} documents</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-secondary bg-primary p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4">Project Documents Uploaded ({status.documents.length})</h3>
                                {status.documents.length > 0 ? (
                                    <div className="space-y-2">
                                        {status.documents.map((doc) => (
                                            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-secondary p-3">
                                                <div className="flex items-center gap-3">
                                                    <File02 className="size-5 text-tertiary" />
                                                    <div>
                                                        <p className="text-sm font-medium text-primary">{doc.filename}</p>
                                                        <p className="text-xs text-tertiary">{(doc.fileSize / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary">No documents uploaded yet</p>
                                )}
                            </div>

                            {status.analysisWarnings && status.analysisWarnings.length > 0 && (
                                <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="size-5 text-warning-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-warning-900">Review Recommended</p>
                                            <ul className="mt-2 space-y-1">
                                                {status.analysisWarnings.map((warning, index) => (
                                                    <li key={index} className="text-sm text-warning-700">• {warning.message}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <Button href={`/worldbank/setup/setup-new-project?edit=${projectId}`} iconLeading={Edit05} color="primary" size="md" className="w-full">
                                Edit Configuration
                            </Button>

                            <div className="rounded-lg border border-secondary bg-primary p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4">Project Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-tertiary">Project ID</p>
                                        <p className="text-sm font-mono text-primary">{status.projectId}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-tertiary">Created</p>
                                        <p className="text-sm text-primary">{new Date(status.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-tertiary">Module Type</p>
                                        <Badge color="brand">WORLDBANK</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg bg-gray-50 p-4">
                                <h4 className="text-sm font-medium text-primary mb-2">Need Help?</h4>
                                <p className="text-xs text-tertiary mb-3">Learn more about configuring project knowledgebases</p>
                                <Button size="sm" color="tertiary" className="w-full">View Documentation</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
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
