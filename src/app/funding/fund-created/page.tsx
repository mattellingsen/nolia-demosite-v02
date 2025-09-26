"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    CheckCircle,
    Clock,
    ArrowLeft,
    FileCheck02,
    Target01,
    File02,
    UploadCloud01,
    Beaker02,
    Zap,
    ClipboardCheck,
    Plus,
    AlertTriangle,
    RefreshCw05,
    ArrowRight,
    CheckDone01,
    Edit05,
    Send01,
    TrendUp02,
    Flash,
    MessageSmileSquare,
    BarChart01
} from "@untitledui/icons";
import { Area, AreaChart, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis } from "recharts";
import { ChartTooltipContent } from "@/components/application/charts/charts-base";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { Badge } from "@/components/base/badges/badges";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { TableRowActionsDropdown } from "@/components/application/table/table";

interface ProcessingStatus {
    fundId: string;
    fundName: string;
    fundDescription?: string;
    status: 'CREATED' | 'PROCESSING' | 'ACTIVE' | 'ERROR';
    documentsUploaded: {
        applicationForm: boolean;
        selectionCriteria: number;
        goodExamples: number;
        outputTemplates: number;
    };
    brainBuilding: {
        status: 'PENDING' | 'ANALYZING' | 'COMPLETE' | 'ERROR';
        progress: number;
        currentTask?: string;
        estimatedCompletion?: string;
    };
    createdAt: string;
    analysisWarnings?: Array<{
        type: 'GOOD_EXAMPLES' | 'SELECTION_CRITERIA' | 'APPLICATION_FORM';
        message: string;
        analysisMode: string;
        requiresReview: boolean;
    }>;
}

// Chart data for fund performance visualization
const lineData = [
    { date: "2025-01-01", A: 120, B: 80 },
    { date: "2025-02-01", A: 70, B: 60 },
    { date: "2025-03-01", A: 10, B: 35 },
    { date: "2025-04-01", A: 40, B: 45 },
    { date: "2025-05-01", A: 70, B: 0 },
    { date: "2025-06-01", A: 50, B: 0 },
    { date: "2025-07-01", A: 60, B: 70 },
    { date: "2025-08-01", A: 75, B: 50 },
    { date: "2025-09-01", A: 85, B: 50 },
];

function FundCreatedContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fundId = searchParams.get('fundId');
    
    const [status, setStatus] = useState<ProcessingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [isProcessingManually, setIsProcessingManually] = useState(false);

    // Fetch real job status from API
    useEffect(() => {
        if (!fundId) {
            setError('No fund ID provided');
            setLoading(false);
            return;
        }

        let intervalId: NodeJS.Timeout;

        const fetchStatus = async () => {
            try {
                const response = await fetch(`/api/funds/${fundId}/job-status`);
                if (!response.ok) {
                    throw new Error('Failed to fetch status');
                }

                const data = await response.json();

                // Fetch fund details for name and analysis warnings
                const fundResponse = await fetch(`/api/funds/${fundId}`);
                const fundData = fundResponse.ok ? await fundResponse.json() : null;

                // Check for analysis warnings in fund data
                const analysisWarnings = [];
                if (fundData?.fund) {
                    const fund = fundData.fund;

                    // Check good examples analysis
                    if (fund.goodExamplesAnalysis?.analysisMode === 'BASIC_FALLBACK') {
                        analysisWarnings.push({
                            type: 'GOOD_EXAMPLES',
                            message: fund.goodExamplesAnalysis.analysisWarning || 'AI analysis failed for good examples - using basic fallback analysis.',
                            analysisMode: fund.goodExamplesAnalysis.analysisMode,
                            requiresReview: fund.goodExamplesAnalysis.requiresReview || false
                        });
                    }

                    // Check selection criteria analysis
                    if (fund.selectionCriteriaAnalysis?.analysisMode === 'BASIC_FALLBACK') {
                        analysisWarnings.push({
                            type: 'SELECTION_CRITERIA',
                            message: fund.selectionCriteriaAnalysis.analysisWarning || 'AI analysis failed for selection criteria - using basic fallback analysis.',
                            analysisMode: fund.selectionCriteriaAnalysis.analysisMode,
                            requiresReview: fund.selectionCriteriaAnalysis.requiresReview || false
                        });
                    }

                    // Check application form analysis
                    if (fund.applicationFormAnalysis?.analysisMode === 'BASIC_FALLBACK') {
                        analysisWarnings.push({
                            type: 'APPLICATION_FORM',
                            message: fund.applicationFormAnalysis.analysisWarning || 'AI analysis failed for application form - using basic fallback analysis.',
                            analysisMode: fund.applicationFormAnalysis.analysisMode,
                            requiresReview: fund.applicationFormAnalysis.requiresReview || false
                        });
                    }
                }
                
                // Transform API response to our ProcessingStatus format
                const ragJob = data.ragProcessing;
                const overallStatus = data.overallStatus;
                
                // Use actual document counts from API
                const documents = data.documentsUploaded || {
                    applicationForm: false,
                    selectionCriteria: 0,
                    goodExamples: 0,
                    outputTemplates: 0
                };
                
                const transformedStatus: ProcessingStatus = {
                    fundId: data.fundId,
                    fundName: fundData?.fund?.name || "Funding Program",
                    fundDescription: fundData?.fund?.description,
                    status: overallStatus === 'completed' ? 'ACTIVE' :
                           overallStatus === 'failed' ? 'ERROR' :
                           overallStatus === 'processing' ? 'PROCESSING' : 'CREATED',
                    documentsUploaded: documents,
                    brainBuilding: {
                        status: ragJob ? 
                               (ragJob.status === 'COMPLETED' ? 'COMPLETE' : 
                                ragJob.status === 'FAILED' ? 'ERROR' : 
                                ragJob.status === 'PROCESSING' ? 'ANALYZING' : 'PENDING') : 
                               'PENDING',
                        progress: ragJob?.progress || 0,
                        currentTask: ragJob?.status === 'PROCESSING' ? 
                                   'Building knowledge base from documents' : 
                                   ragJob?.status === 'COMPLETED' ? 
                                   'Analysis complete' : 
                                   'Waiting to start',
                        estimatedCompletion: ragJob?.status === 'PROCESSING' ? '2-3 minutes' : undefined
                    },
                    createdAt: data.jobs[0]?.createdAt || new Date().toISOString(),
                    analysisWarnings
                };
                
                setStatus(transformedStatus);
                setLoading(false);
                
                // Stop polling if complete or error
                if (overallStatus === 'completed' || overallStatus === 'failed') {
                    if (intervalId) clearInterval(intervalId);
                }
            } catch (err) {
                console.error('Error fetching status:', err);
                
                // Fallback to mock data if API fails
                const mockStatus: ProcessingStatus = {
                    fundId: fundId,
                    fundName: "Funding Program",
                    fundDescription: "Fund innovative businesses to employ tertiary-level students as full-time interns over their summer break.",
                    status: 'PROCESSING',
                    documentsUploaded: {
                        applicationForm: true,
                        selectionCriteria: 3,
                        goodExamples: 2,
                        outputTemplates: 1
                    },
                    brainBuilding: {
                        status: 'ANALYZING',
                        progress: 45,
                        currentTask: 'Analyzing selection criteria documents',
                        estimatedCompletion: '2-3 minutes'
                    },
                    createdAt: new Date().toISOString()
                };
                
                setStatus(mockStatus);
                setLoading(false);
            }
        };
        
        // Initial fetch
        fetchStatus();
        
        // Poll every 3 seconds
        intervalId = setInterval(fetchStatus, 3000);
        
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [fundId]);

    // Manual processing trigger
    const handleProcessNow = async () => {
        if (!fundId || isProcessingManually) return;
        
        setIsProcessingManually(true);
        
        try {
            const response = await fetch('/api/jobs/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ force: true }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to trigger processing');
            }
            
            const result = await response.json();
            console.log('Manual processing triggered:', result);
            
            // Clear any existing error and trigger a fresh status fetch
            setError('');
            
            // Trigger an immediate status check
            setTimeout(() => {
                setIsProcessingManually(false);
                // The useEffect will continue polling
            }, 2000);
            
        } catch (err) {
            console.error('Error triggering manual processing:', err);
            setError(`Failed to trigger processing: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsProcessingManually(false);
        }
    };

    // Retry AI processing after failure
    const handleRetryProcessing = async () => {
        if (!fundId || isProcessingManually) return;

        setIsProcessingManually(true);
        setError('');

        try {
            const response = await fetch(`/api/funds/${fundId}/retry-processing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to retry processing');
            }

            const result = await response.json();
            console.log('Retry processing triggered:', result);

            // Trigger an immediate status check
            setTimeout(() => {
                setIsProcessingManually(false);
                // The useEffect will continue polling
            }, 2000);

        } catch (err) {
            console.error('Error retrying processing:', err);
            setError(`Failed to retry processing: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsProcessingManually(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-primary flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                    <p className="text-secondary">Loading fund status...</p>
                </div>
            </div>
        );
    }

    if (error || !status) {
        return (
            <div className="min-h-screen bg-primary flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="mb-4">
                        <FeaturedIcon size="lg" color="error" theme="light" icon={CheckCircle} />
                    </div>
                    <h1 className="text-xl font-semibold text-primary mb-2">Error Loading Fund</h1>
                    <p className="text-secondary mb-6">{error || 'Fund not found'}</p>
                    <Button 
                        color="primary" 
                        onClick={() => router.push('/funding/setup')}
                    >
                        Back to Setup
                    </Button>
                </div>
            </div>
        );
    }

    const getStatusBadge = () => {
        switch (status.status) {
            case 'CREATED':
                return <Badge color="gray">Created</Badge>;
            case 'PROCESSING':
                return <Badge color="warning">Processing</Badge>;
            case 'ACTIVE':
                return <Badge color="success">Active</Badge>;
            case 'ERROR':
                return <Badge color="error">Error</Badge>;
        }
    };

    const getBrainStatusIcon = () => {
        switch (status.brainBuilding.status) {
            case 'PENDING':
                return <Clock className="w-5 h-5 text-gray-400" />;
            case 'ANALYZING':
                return <Beaker02 className="w-5 h-5 text-warning-600 animate-pulse" />;
            case 'COMPLETE':
                return <CheckCircle className="w-5 h-5 text-success-600" />;
            case 'ERROR':
                return <CheckCircle className="w-5 h-5 text-error-600" />;
        }
    };

    const totalDocuments = 1 + status.documentsUploaded.selectionCriteria + 
                          status.documentsUploaded.goodExamples + 
                          status.documentsUploaded.outputTemplates;

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/funding/setup"
                items={[
                    {
                        label: "Setup",
                        href: "/funding/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Apply",
                        href: "/funding/apply",
                        icon: Send01,
                    },
                    {
                        label: "Assess",
                        href: "/funding/assess",
                        icon: CheckDone01,
                    },
                    {
                        label: "Analytics",
                        href: "/funding/analytics",
                        icon: TrendUp02,
                    },
                ]}
            />
            <main className="flex min-w-0 flex-1 flex-col gap-8 pt-8 pb-12 px-4 lg:px-8">
                {/* Header */}
                <div className="text-center space-y-4 mb-8">
                    <div className="flex justify-center mb-4">
                        <FeaturedIcon 
                            size="xl" 
                            color="success" 
                            theme="light" 
                            icon={status.status === 'ACTIVE' ? CheckCircle : Clock} 
                        />
                    </div>
                    <div>
                        <h1 className="text-display-sm font-semibold text-primary mb-2">
                            {status.fundName}
                        </h1>
                        <p className="text-lg text-secondary max-w-2xl mx-auto">
                            {status.fundDescription || 'Fund innovative businesses to employ tertiary-level students as full-time interns over their summer break.'}
                        </p>
                    </div>
                </div>

                {/* Analysis Warnings - Show when there are fallback analyses */}
                {status.analysisWarnings && status.analysisWarnings.length > 0 && (
                    <div className="bg-warning-50 border border-warning-200 rounded-lg p-6 mb-8">
                        <div className="flex items-start gap-4">
                            <FeaturedIcon size="md" color="warning" theme="light" icon={AlertTriangle} />
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-warning-900 mb-2">
                                    Analysis Warnings Detected
                                </h3>
                                <p className="text-sm text-warning-800 mb-4">
                                    Some document analyses encountered issues and used basic fallback processing.
                                    Your fund is still functional, but assessment quality may be reduced.
                                </p>
                                <div className="space-y-3 mb-4">
                                    {status.analysisWarnings.map((warning, index) => (
                                        <div key={index} className="bg-warning-100 rounded-md p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertTriangle className="w-4 h-4 text-warning-600" />
                                                <span className="text-sm font-medium text-warning-900">
                                                    {warning.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Analysis
                                                </span>
                                            </div>
                                            <p className="text-sm text-warning-800 ml-6">
                                                {warning.message}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        size="sm"
                                        color="warning"
                                        iconLeading={RefreshCw05}
                                        onClick={() => {
                                            // Force a re-fetch to trigger reprocessing
                                            window.location.reload();
                                        }}
                                    >
                                        Retry Analysis
                                    </Button>
                                    <Button
                                        size="sm"
                                        color="tertiary"
                                        onClick={() => router.push('/funding/setup')}
                                    >
                                        Upload New Documents
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Fund Info Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-primary">Documents Uploaded</h2>
                        {getStatusBadge()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Documents Summary */}
                        <div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon size="sm" color="success" theme="light" icon={UploadCloud01} />
                                    <span className="text-sm text-secondary">
                                        Application Form ({status.documentsUploaded.applicationForm ? '1' : '0'} file)
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon size="sm" color="success" theme="light" icon={FileCheck02} />
                                    <span className="text-sm text-secondary">
                                        Selection Criteria ({status.documentsUploaded.selectionCriteria} files)
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon size="sm" color="success" theme="light" icon={Target01} />
                                    <span className="text-sm text-secondary">
                                        Good Examples ({status.documentsUploaded.goodExamples} files)
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon size="sm" color="success" theme="light" icon={File02} />
                                    <span className="text-sm text-secondary">
                                        Output Templates ({status.documentsUploaded.outputTemplates} files)
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-tertiary">
                                Total: {totalDocuments} documents processed
                            </div>
                        </div>

                        {/* Brain Building Status */}
                        <div>
                            <h3 className="text-md font-medium text-primary mb-3">AI Brain Status</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    {getBrainStatusIcon()}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-primary">
                                                {status.brainBuilding.status === 'COMPLETE' ? 'Complete' : 'Building Knowledge Base'}
                                            </span>
                                            <span className="text-sm text-secondary">
                                                {Math.round(status.brainBuilding.progress)}%
                                            </span>
                                        </div>
                                        <ProgressBar 
                                            value={status.brainBuilding.progress} 
                                            className="h-2"
                                        />
                                    </div>
                                </div>
                                
                                {status.brainBuilding.currentTask && (
                                    <div className="text-sm text-secondary">
                                        <strong>Current task:</strong> {status.brainBuilding.currentTask}
                                    </div>
                                )}
                                
                                {status.brainBuilding.estimatedCompletion && (
                                    <div className="text-sm text-tertiary">
                                        Estimated completion: {status.brainBuilding.estimatedCompletion}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-primary mb-4">Fund Performance Projection</h2>
                    <div className="flex h-54 flex-col gap-2">
                        <ResponsiveContainer className="h-full">
                            <AreaChart
                                data={lineData}
                                className="text-tertiary [&_.recharts-text]:text-xs"
                                margin={{
                                    left: 5,
                                    right: 5,
                                }}
                            >
                                <defs>
                                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="currentColor" className="text-utility-brand-700" stopOpacity="0.7" />
                                        <stop offset="95%" stopColor="currentColor" className="text-utility-brand-700" stopOpacity="0" />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid vertical={false} stroke="currentColor" className="text-utility-gray-100" />

                                <XAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tickMargin={10}
                                    interval="preserveStartEnd"
                                    dataKey="date"
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                        return months[date.getMonth()];
                                    }}
                                />

                                <RechartsTooltip
                                    content={<ChartTooltipContent />}
                                    labelFormatter={(value) => {
                                        const date = new Date(value);
                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                        return `${months[date.getMonth()]} ${date.getFullYear()}`;
                                    }}
                                    cursor={{
                                        className: "stroke-utility-brand-600 stroke-2",
                                    }}
                                />

                                <Area
                                    isAnimationActive={false}
                                    className="text-utility-brand-600 [&_.recharts-area-area]:translate-y-[6px] [&_.recharts-area-area]:[clip-path:inset(0_0_6px_0)]"
                                    dataKey="A"
                                    name="Applications Received"
                                    type="monotone"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    fill="url(#gradient)"
                                    fillOpacity={0.1}
                                    activeDot={{
                                        className: "fill-bg-primary stroke-utility-brand-600 stroke-2",
                                    }}
                                />

                                <Area
                                    isAnimationActive={false}
                                    className="text-utility-success-400 [&_.recharts-area-area]:translate-y-[6px] [&_.recharts-area-area]:[clip-path:inset(0_0_6px_0)]"
                                    dataKey="B"
                                    name="Applications Approved"
                                    type="monotone"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    fill="none"
                                    activeDot={{
                                        className: "fill-bg-primary stroke-utility-brand-600 stroke-2",
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Next Steps */}
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-semibold text-primary mb-4">What's Next?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon size="sm" color="brand" theme="light" icon={Beaker02} />
                            <div>
                                <h4 className="text-sm font-medium text-primary">Test Your Fund</h4>
                                <p className="text-sm text-secondary">
                                    Upload sample applications to validate your AI assessment system.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <FeaturedIcon size="sm" color="brand" theme="light" icon={Zap} />
                            <div>
                                <h4 className="text-sm font-medium text-primary">Start Accepting Applications</h4>
                                <p className="text-sm text-secondary">
                                    Share your application form and begin receiving submissions.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <FeaturedIcon size="sm" color="brand" theme="light" icon={ClipboardCheck} />
                            <div>
                                <h4 className="text-sm font-medium text-primary">Assess Applications</h4>
                                <p className="text-sm text-secondary">
                                    Review and evaluate submitted applications using your AI-powered assessment.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <FeaturedIcon size="sm" color="brand" theme="light" icon={Plus} />
                            <div>
                                <h4 className="text-sm font-medium text-primary">Set Up Another Fund</h4>
                                <p className="text-sm text-secondary">
                                    Create additional funding programs with different criteria and requirements.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        size="lg"
                        color="tertiary"
                        iconLeading={ArrowLeft}
                        onClick={() => router.push('/funding/setup')}
                    >
                        Back to Setup
                    </Button>
                    
                    {status.status === 'PROCESSING' && (
                        <Button
                            size="lg"
                            color="secondary"
                            isDisabled
                        >
                            Processing... ({Math.round(status.brainBuilding.progress)}%)
                        </Button>
                    )}
                    
                    {status.brainBuilding.status === 'ERROR' && (
                        <Button
                            size="lg"
                            color="primary"
                            iconLeading={RefreshCw05}
                            onClick={handleRetryProcessing}
                            isDisabled={isProcessingManually}
                        >
                            {isProcessingManually ? 'Retrying AI Analysis...' : 'Retry AI Processing'}
                        </Button>
                    )}

                    {(status.status === 'PROCESSING' && status.brainBuilding.progress === 0) && (
                        <Button
                            size="lg"
                            color="primary"
                            iconLeading={Zap}
                            onClick={handleProcessNow}
                            isDisabled={isProcessingManually}
                        >
                            {isProcessingManually ? 'Processing...' : 'Process Now'}
                        </Button>
                    )}
                </div>

            </main>

            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex flex-col gap-5 px-6 pt-8">
                    <div className="flex items-start justify-between">
                        <p className="text-lg font-semibold text-primary">Actions</p>
                        <TableRowActionsDropdown />
                    </div>
                    <div className="flex flex-col gap-3">
                        <a href="/funding/apply" className="flex items-center gap-3 rounded-xl bg-utility-green-50 p-4 hover:bg-utility-green-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={MessageSmileSquare} className="bg-utility-green-100 text-utility-green-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-green-700">Create ApplicationBot</p>
                                <ArrowRight className="text-utility-green-700 w-4 h-4" />
                            </div>
                        </a>
                        <a href="/funding/upload-applications" className="flex items-center gap-3 rounded-xl bg-utility-blue-50 p-4 hover:bg-utility-blue-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={UploadCloud01} className="bg-utility-blue-100 text-utility-blue-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-blue-700">Upload applications</p>
                                <ArrowRight className="text-utility-blue-700 w-4 h-4" />
                            </div>
                        </a>
                        <div className="flex items-center gap-3 rounded-xl bg-utility-pink-50 p-4 hover:bg-utility-pink-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={Flash} className="bg-utility-pink-100 text-utility-pink-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-pink-700">Automate assessments</p>
                                <ArrowRight className="text-utility-pink-700 w-4 h-4" />
                            </div>
                        </div>
                        <a href="/funding/analytics" className="flex items-center gap-3 rounded-xl bg-utility-purple-50 p-4 hover:bg-utility-purple-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={BarChart01} className="bg-utility-purple-100 text-utility-purple-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-purple-700">View analytics</p>
                                <ArrowRight className="text-utility-purple-700 w-4 h-4" />
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function FundCreatedPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-primary flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                    <p className="text-secondary">Loading fund status...</p>
                </div>
            </div>
        }>
            <FundCreatedContent />
        </Suspense>
    );
}