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
    Database02
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { Badge } from "@/components/base/badges/badges";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";

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
        type: 'POLICIES' | 'COMPLIANCE' | 'TEMPLATES' | 'GOVERNANCE';
        message: string;
        requiresReview: boolean;
    }>;
}

function BaseCreatedContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const baseId = searchParams.get('baseId');

    const [status, setStatus] = useState<ProcessingStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch real job status from API
    const fetchJobStatus = async () => {
        if (!baseId) return;

        try {
            const response = await fetch(`/api/procurement-base/${baseId}/job-status`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch job status');
            }

            // Map API response to our interface
            const mappedStatus: ProcessingStatus = {
                baseId: data.baseId,
                baseName: data.baseName || 'Untitled Knowledgebase',
                baseDescription: data.baseDescription,
                status: mapBaseStatus(data.baseStatus, data.overallStatus),
                documentsUploaded: data.documentsUploaded,
                brainBuilding: data.brainBuilding ? {
                    status: mapJobStatus(data.brainBuilding.status),
                    progress: data.brainBuilding.progress || 0,
                    currentTask: data.brainBuilding.currentTask || 'Waiting to start...',
                    estimatedCompletion: data.brainBuilding.estimatedCompletion,
                    processedDocuments: data.brainBuilding.processedDocuments,
                    totalDocuments: data.brainBuilding.totalDocuments,
                    errorMessage: data.brainBuilding.errorMessage
                } : {
                    status: 'PENDING',
                    progress: 0,
                    currentTask: 'Waiting to start...'
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

    // Poll for updates if processing
    useEffect(() => {
        fetchJobStatus();

        const interval = setInterval(() => {
            if (status?.brainBuilding.status === 'PROCESSING') {
                fetchJobStatus();
            }
        }, 3000); // Poll every 3 seconds while processing

        return () => clearInterval(interval);
    }, [baseId, status?.brainBuilding.status]);

    // Helper functions to map API statuses to our interface
    const mapBaseStatus = (baseStatus: string, overallStatus: string): 'CREATED' | 'PROCESSING' | 'ACTIVE' | 'ERROR' => {
        if (overallStatus === 'failed') return 'ERROR';
        if (overallStatus === 'completed') return 'ACTIVE';
        if (overallStatus === 'processing') return 'PROCESSING';
        return 'CREATED';
    };

    const mapJobStatus = (jobStatus: string): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' => {
        switch (jobStatus) {
            case 'PROCESSING': return 'PROCESSING';
            case 'COMPLETED': return 'COMPLETED';
            case 'FAILED': return 'FAILED';
            default: return 'PENDING';
        }
    };

    const getStatusColor = () => {
        if (!status) return 'gray';
        switch (status.brainBuilding.status) {
            case 'COMPLETED':
                return 'success';
            case 'FAILED':
                return 'error';
            case 'PROCESSING':
                return 'warning';
            default:
                return 'gray';
        }
    };

    const getStatusIcon = () => {
        if (!status) return Clock;
        switch (status.brainBuilding.status) {
            case 'COMPLETED':
                return CheckCircle;
            case 'FAILED':
                return AlertTriangle;
            case 'PROCESSING':
                return Clock;
            default:
                return Clock;
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-tertiary">Loading knowledgebase status...</div>
            </div>
        );
    }

    // Error state
    if (error || !status) {
        return (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-error-300 bg-error-50 p-8 text-center">
                <FeaturedIcon icon={AlertTriangle} color="error" size="lg" />
                <div>
                    <p className="font-semibold text-primary">Failed to load knowledgebase status</p>
                    <p className="mt-1 text-sm text-tertiary">{error || 'Unknown error occurred'}</p>
                </div>
                <Button
                    size="sm"
                    color="primary"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </Button>
            </div>
        );
    }

    // No baseId
    if (!baseId) {
        return (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-error-300 bg-error-50 p-8 text-center">
                <FeaturedIcon icon={AlertTriangle} color="error" size="lg" />
                <div>
                    <p className="font-semibold text-primary">Invalid knowledgebase</p>
                    <p className="mt-1 text-sm text-tertiary">No knowledgebase ID provided</p>
                </div>
                <Button
                    size="sm"
                    color="primary"
                    href="/procurement-admin/setup"
                >
                    Go Back
                </Button>
            </div>
        );
    }


    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/procurement-admin"
                items={[
                    {
                        label: "Setup",
                        href: "/procurement-admin/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Settings",
                        href: "/procurement-admin/settings",
                        icon: Settings01,
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
                            href="/procurement-admin/setup"
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back to Dashboard
                        </Button>
                        <div className="flex flex-col gap-1">
                            <p className="text-md font-semibold text-tertiary">Procurement Base</p>
                            <p className="text-display-md font-semibold text-primary">{status.baseName}</p>
                            {status.baseDescription && (
                                <p className="text-md text-tertiary mt-2">{status.baseDescription}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="px-4 lg:px-8">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Left Column - Processing Status */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Processing Card */}
                            <div className="rounded-lg border border-secondary bg-primary p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">Base Configuration Status</h3>
                                        <p className="text-sm text-tertiary mt-1">
                                            Building your procurement knowledge base
                                        </p>
                                    </div>
                                    <Badge color={getStatusColor()} theme="modern">
                                        <FeaturedIcon icon={getStatusIcon()} size="sm" />
                                        {status.brainBuilding.status}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-primary">
                                                {status.brainBuilding.currentTask}
                                            </p>
                                            <span className="text-sm text-tertiary">
                                                {status.brainBuilding.progress}%
                                            </span>
                                        </div>
                                        <ProgressBar value={status.brainBuilding.progress} size="md" />
                                        {status.brainBuilding.estimatedCompletion &&
                                         status.brainBuilding.status === 'PROCESSING' && (
                                            <p className="text-xs text-tertiary mt-2">
                                                Estimated completion: {status.brainBuilding.estimatedCompletion}
                                            </p>
                                        )}
                                        {status.brainBuilding.status === 'FAILED' && status.brainBuilding.errorMessage && (
                                            <div className="mt-2 text-xs text-error-600">
                                                Error: {status.brainBuilding.errorMessage}
                                            </div>
                                        )}
                                        {status.brainBuilding.processedDocuments !== undefined && status.brainBuilding.totalDocuments !== undefined && (
                                            <p className="text-xs text-tertiary mt-2">
                                                Processed {status.brainBuilding.processedDocuments} of {status.brainBuilding.totalDocuments} documents
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Documents Uploaded */}
                            <div className="rounded-lg border border-secondary bg-primary p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4">
                                    Documents Uploaded ({Object.values(status.documentsUploaded).reduce((sum, count) => sum + count, 0)})
                                </h3>
                                {Object.values(status.documentsUploaded).reduce((sum, count) => sum + count, 0) > 0 ? (
                                    <div className="space-y-2">
                                        {status.documentsUploaded.policies > 0 && (
                                            <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
                                                <div className="flex items-center gap-3">
                                                    <File02 className="size-5 text-tertiary" />
                                                    <div>
                                                        <p className="text-sm font-medium text-primary">
                                                            {status.documentsUploaded.policies} Policy Document{status.documentsUploaded.policies > 1 ? 's' : ''}
                                                        </p>
                                                        <p className="text-xs text-tertiary">Processed and indexed</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {status.documentsUploaded.complianceDocs > 0 && (
                                            <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
                                                <div className="flex items-center gap-3">
                                                    <File02 className="size-5 text-tertiary" />
                                                    <div>
                                                        <p className="text-sm font-medium text-primary">
                                                            {status.documentsUploaded.complianceDocs} Compliance Document{status.documentsUploaded.complianceDocs > 1 ? 's' : ''}
                                                        </p>
                                                        <p className="text-xs text-tertiary">Processed and indexed</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {status.documentsUploaded.standardTemplates > 0 && (
                                            <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
                                                <div className="flex items-center gap-3">
                                                    <File02 className="size-5 text-tertiary" />
                                                    <div>
                                                        <p className="text-sm font-medium text-primary">
                                                            {status.documentsUploaded.standardTemplates} Standard Template{status.documentsUploaded.standardTemplates > 1 ? 's' : ''}
                                                        </p>
                                                        <p className="text-xs text-tertiary">Processed and indexed</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {status.documentsUploaded.governanceRules > 0 && (
                                            <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
                                                <div className="flex items-center gap-3">
                                                    <File02 className="size-5 text-tertiary" />
                                                    <div>
                                                        <p className="text-sm font-medium text-primary">
                                                            {status.documentsUploaded.governanceRules} Governance Document{status.documentsUploaded.governanceRules > 1 ? 's' : ''}
                                                        </p>
                                                        <p className="text-xs text-tertiary">Processed and indexed</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-tertiary">No documents uploaded yet</p>
                                )}
                            </div>

                            {/* Warnings/Notices */}
                            {status.analysisWarnings && status.analysisWarnings.length > 0 && (
                                <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="size-5 text-warning-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-warning-900">Review Recommended</p>
                                            <ul className="mt-2 space-y-1">
                                                {status.analysisWarnings.map((warning, index) => (
                                                    <li key={index} className="text-sm text-warning-700">
                                                        • {warning.message}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Actions & Info */}
                        <div className="space-y-6">
                            {/* Edit Configuration */}
                            <Button
                                href={`/procurement-admin/setup/setup-procurement-base?edit=${baseId}`}
                                iconLeading={Edit05}
                                color="primary"
                                size="md"
                                className="w-full"
                            >
                                Edit Configuration
                            </Button>

                            {/* Base Info */}
                            <div className="rounded-lg border border-secondary bg-primary p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4">Base Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-tertiary">Base ID</p>
                                        <p className="text-sm font-mono text-primary">{status.baseId}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-tertiary">Created</p>
                                        <p className="text-sm text-primary">
                                            {new Date(status.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-tertiary">Module Type</p>
                                        <Badge color="purple" theme="modern">
                                            PROCUREMENT_ADMIN
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Help & Support */}
                            <div className="rounded-lg bg-gray-50 p-4">
                                <h4 className="text-sm font-medium text-primary mb-2">Need Help?</h4>
                                <p className="text-xs text-tertiary mb-3">
                                    Learn more about configuring procurement standards
                                </p>
                                <Button size="sm" color="tertiary" className="w-full">
                                    View Documentation
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function BaseCreatedPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <div className="text-tertiary">Loading...</div>
            </div>
        }>
            <BaseCreatedContent />
        </Suspense>
    );
}