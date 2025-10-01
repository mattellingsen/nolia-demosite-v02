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
        status: 'PENDING' | 'ANALYSING' | 'COMPLETE' | 'ERROR';
        progress: number;
        currentTask?: string;
        estimatedCompletion?: string;
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

    // Mock processing status (in real app, would fetch from API)
    const [status, setStatus] = useState<ProcessingStatus>({
        baseId: baseId || 'new-base-id',
        baseName: 'Corporate Procurement Standards 2025',
        baseDescription: 'Company-wide procurement standards and templates',
        status: 'PROCESSING',
        documentsUploaded: {
            policies: 2,
            complianceDocs: 0,
            standardTemplates: 0,
            governanceRules: 0
        },
        brainBuilding: {
            status: 'ANALYSING',
            progress: 45,
            currentTask: 'Analyzing compliance requirements...',
            estimatedCompletion: '2 minutes'
        },
        createdAt: new Date().toISOString()
    });

    // Simulate processing progress
    useEffect(() => {
        const interval = setInterval(() => {
            setStatus(prev => {
                if (prev.brainBuilding.progress >= 100) {
                    clearInterval(interval);
                    return {
                        ...prev,
                        status: 'ACTIVE',
                        brainBuilding: {
                            ...prev.brainBuilding,
                            status: 'COMPLETE',
                            progress: 100,
                            currentTask: 'Base configuration complete'
                        }
                    };
                }

                const newProgress = Math.min(prev.brainBuilding.progress + 15, 100);
                const tasks = [
                    'Processing policy documents...',
                    'Analysing compliance requirements...',
                    'Organising standard templates...',
                    'Mapping governance workflows...',
                    'Building knowledge base...',
                    'Finalising configuration...'
                ];
                const taskIndex = Math.floor((newProgress / 100) * tasks.length);

                return {
                    ...prev,
                    brainBuilding: {
                        ...prev.brainBuilding,
                        progress: newProgress,
                        currentTask: tasks[Math.min(taskIndex, tasks.length - 1)]
                    }
                };
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = () => {
        switch (status.brainBuilding.status) {
            case 'COMPLETE':
                return 'success';
            case 'ERROR':
                return 'error';
            case 'ANALYSING':
                return 'warning';
            default:
                return 'gray';
        }
    };

    const getStatusIcon = () => {
        switch (status.brainBuilding.status) {
            case 'COMPLETE':
                return CheckCircle;
            case 'ERROR':
                return AlertTriangle;
            case 'ANALYSING':
                return Clock;
            default:
                return Clock;
        }
    };


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
                                         status.brainBuilding.status === 'ANALYSING' && (
                                            <p className="text-xs text-tertiary mt-2">
                                                Estimated completion: {status.brainBuilding.estimatedCompletion}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Documents Uploaded */}
                            <div className="rounded-lg border border-secondary bg-primary p-6">
                                <h3 className="text-lg font-semibold text-primary mb-4">Documents Uploaded ({status.documentsUploaded.policies})</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
                                        <div className="flex items-center gap-3">
                                            <File02 className="size-5 text-tertiary" />
                                            <div>
                                                <p className="text-sm font-medium text-primary">Corporate Procurement Policy 2025.pdf</p>
                                                <p className="text-xs text-tertiary">125.3 KB</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
                                        <div className="flex items-center gap-3">
                                            <File02 className="size-5 text-tertiary" />
                                            <div>
                                                <p className="text-sm font-medium text-primary">Vendor Selection Guidelines.pdf</p>
                                                <p className="text-xs text-tertiary">89.7 KB</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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