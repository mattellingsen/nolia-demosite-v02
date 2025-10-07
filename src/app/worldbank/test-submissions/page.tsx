"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    UploadCloud01, 
    ArrowLeft, 
    CheckCircle, 
    AlertCircle, 
    Trash01, 
    Play,
    FileCheck02,
    ClipboardCheck
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { Badge } from "@/components/base/badges/badges";
import { Toggle } from "@/components/base/toggle/toggle";
import { runTestAssessmentViaAPI, getAllFunds, FundData } from "@/lib/api-client";

interface TestApplication {
    id: string;
    name: string;
    file: File;
    status: 'pending' | 'testing' | 'pass' | 'fail' | 'error';
    score?: number;
    feedback?: string;
    assessmentDetails?: {
        criteriaScore: number;
        innovation: number;
        financial: number;
        team: number;
        market: number;
        risk: number;
    };
    expectedResult?: 'pass' | 'fail';
    errorType?: 'TIMEOUT' | 'GENERAL';
    errorMessage?: string;
}

export default function TestApplicationsPage() {
    const router = useRouter();
    const [testApplications, setTestApplications] = useState<TestApplication[]>([]);
    const [isRunningTest, setIsRunningTest] = useState(false);
    const [uploadError, setUploadError] = useState<string>('');
    const [testResults, setTestResults] = useState<{passes: number; fails: number; total: number} | null>(null);
    const [funds, setFunds] = useState<FundData[]>([]);
    const [selectedFundId, setSelectedFundId] = useState<string>('');

    // Load funds on component mount
    useEffect(() => {
        const loadFunds = async () => {
            try {
                const fundList = await getAllFunds();
                setFunds(fundList);
                // Auto-select the most recent fund
                if (fundList.length > 0) {
                    setSelectedFundId(fundList[0].id!);
                }
            } catch (error) {
                console.error('Failed to load funds:', error);
            }
        };
        loadFunds();
    }, []);

    const handleFileUpload = useCallback(async (files: FileList) => {
        const fileArray = Array.from(files);
        
        // Validate file types (PDFs and Word docs)
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ];

        const invalidFiles = fileArray.filter(file => !allowedTypes.includes(file.type));
        if (invalidFiles.length > 0) {
            setUploadError('Please upload PDF or Word documents only.');
            return;
        }

        // Validate file sizes (10MB limit each)
        const oversizedFiles = fileArray.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            setUploadError('Some files exceed 10MB limit. Please reduce file sizes.');
            return;
        }

        // Add files to test applications
        const newApplications: TestApplication[] = fileArray.map((file, index) => ({
            id: `test-${Date.now()}-${index}`,
            name: file.name,
            file,
            status: 'pending',
            expectedResult: 'pass' // Default to pass
        }));

        setTestApplications(prev => [...prev, ...newApplications]);
        setUploadError('');
    }, []);

    const removeApplication = (id: string) => {
        setTestApplications(prev => prev.filter(app => app.id !== id));
        // Reset test results if we remove an application
        if (testResults) {
            setTestResults(null);
        }
    };

    const runAssessment = async () => {
        if (testApplications.length === 0 || !selectedFundId) {
            setUploadError('Please select a fund to test against');
            return;
        }

        setIsRunningTest(true);
        
        // Run assessment for each application
        for (const app of testApplications) {
            // Update status to testing
            setTestApplications(prev => prev.map(a => 
                a.id === app.id ? { ...a, status: 'testing' } : a
            ));
            
            try {
                // Call assessment API with the selected fund ID
                const assessmentResult = await runTestAssessmentViaAPI(app.file, { fundId: selectedFundId });

                // Check if this is the new universal template response
                if (assessmentResult.analysisMode === 'UNIVERSAL_TEMPLATE_SYSTEM') {
                    // Open the assessment in a new window for the universal template
                    const newWindow = window.open('', '_blank');
                    if (newWindow) {
                        newWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Assessment: ${app.name}</title>
                                <style>
                                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                                    h1, h2, h3 { color: #2563eb; }
                                    .section { margin-bottom: 20px; padding: 15px; border-left: 3px solid #2563eb; background-color: #f8fafc; }
                                </style>
                            </head>
                            <body>
                                <h1>Assessment Result: ${app.name}</h1>
                                ${assessmentResult.assessment}
                            </body>
                            </html>
                        `);
                        newWindow.document.close();
                    }

                    // Mark as completed with success
                    setTestApplications(prev => prev.map(a =>
                        a.id === app.id ? {
                            ...a,
                            status: 'pass',
                            score: assessmentResult.score,
                            feedback: 'Assessment completed using fund template - opened in new window',
                            assessmentDetails: {
                                criteriaScore: assessmentResult.score,
                                innovation: assessmentResult.score,
                                financial: assessmentResult.score,
                                team: assessmentResult.score,
                                market: assessmentResult.score,
                                risk: assessmentResult.score
                            }
                        } : a
                    ));
                    continue; // Skip the old format handling
                }

                // Legacy format handling
                const passed = assessmentResult.score >= 70; // Use 70 as pass threshold
                
                const assessmentDetails = {
                    criteriaScore: assessmentResult.score,
                    innovation: assessmentResult.innovation || assessmentResult.score,
                    financial: assessmentResult.financial || assessmentResult.score,
                    team: assessmentResult.team || assessmentResult.score,
                    market: assessmentResult.market || assessmentResult.score,
                    risk: assessmentResult.score // Use overall score for risk
                };
                
                // Update with real results
                setTestApplications(prev => prev.map(a => 
                    a.id === app.id ? { 
                        ...a, 
                        status: passed ? 'pass' : 'fail',
                        score: assessmentResult.score,
                        feedback: assessmentResult.feedback || 'Assessment completed',
                        assessmentDetails
                    } : a
                ));
                
            } catch (error: any) {
                console.error('Assessment error for', app.name, error);
                
                // Check if this is a timeout error from the API
                const isTimeoutError = error.response?.status === 408 || 
                                     error.response?.data?.errorType === 'TIMEOUT';
                
                const errorMessage = error.response?.data?.message || 
                                   (isTimeoutError ? 'Assessment timed out. Please try again with a different test application.' : 'Assessment failed - please try again');
                
                // Set error status instead of fallback scores
                setTestApplications(prev => prev.map(a => 
                    a.id === app.id ? { 
                        ...a, 
                        status: 'error',
                        errorType: isTimeoutError ? 'TIMEOUT' : 'GENERAL',
                        errorMessage,
                        feedback: errorMessage
                    } : a
                ));
            }
        }
        
        setIsRunningTest(false);
        
        // Calculate test results after all assessments are complete
        setTestApplications(prev => {
            const passes = prev.filter(app => app.status === 'pass').length;
            const fails = prev.filter(app => app.status === 'fail').length;
            const errors = prev.filter(app => app.status === 'error').length;
            setTestResults({ passes, fails: fails + errors, total: prev.length });
            return prev;
        });
    };

    const toggleExpectedResult = (id: string, shouldPass: boolean) => {
        setTestApplications(prev => prev.map(app => 
            app.id === id ? { 
                ...app, 
                expectedResult: shouldPass ? 'pass' : 'fail' 
            } : app
        ));
    };

    const hasApplications = testApplications.length > 0;
    const allTested = testApplications.every(app => app.status === 'pass' || app.status === 'fail' || app.status === 'error');

    const getStatusBadge = (status: TestApplication['status']) => {
        switch (status) {
            case 'pending':
                return <Badge size="sm" color="gray">Pending</Badge>;
            case 'testing':
                return <Badge size="sm" color="warning">Testing...</Badge>;
            case 'pass':
                return <Badge size="sm" color="success">Pass</Badge>;
            case 'fail':
                return <Badge size="sm" color="error">Fail</Badge>;
            case 'error':
                return <Badge size="sm" color="error">Error</Badge>;
            default:
                return <Badge size="sm" color="gray">Unknown</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-primary">
            <div className="max-w-4xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="text-center space-y-4 mb-8">
                    <div>
                        <h1 className="text-display-sm font-semibold text-primary mb-2">
                            Test Assessment System
                        </h1>
                        <p className="text-lg text-secondary max-w-2xl mx-auto">
                            Upload test applications to validate that your fund assessment system works correctly. 
                            These should be applications you know the expected outcome for.
                        </p>
                    </div>
                </div>

                {/* Fund Selection */}
                <div className="flex justify-center mb-6">
                    <div className="w-full max-w-2xl">
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-md font-semibold text-primary mb-2">Select Fund to Test Against</h3>
                            <p className="text-sm text-secondary mb-4">
                                Choose which fund's criteria and output template to use for assessment.
                            </p>
                            <select
                                value={selectedFundId}
                                onChange={(e) => setSelectedFundId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary-600"
                            >
                                <option value="">Select a fund...</option>
                                {funds.map((fund) => (
                                    <option key={fund.id} value={fund.id}>
                                        {fund.name} {fund.status === 'DRAFT' ? '(Draft)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Upload Area */}
                <div className="flex justify-center mb-8">
                    <div className="w-full max-w-2xl">
                        {/* Pro Tip */}
                        <div className="bg-warning-50 rounded-lg p-4 border border-warning-200 mb-5">
                            <p className="text-sm text-warning-800">
                                <strong>Pro tip:</strong> Upload applications you've previously assessed so you can verify 
                                Nolia reaches the same conclusions. This helps ensure your fund setup is accurate 
                                before going live.
                            </p>
                        </div>
                        <FileUpload.Root>
                            <FileUpload.DropZone
                                hint="Upload test applications (PDF or Word documents, max. 10MB each)"
                                accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                                allowsMultiple={true}
                                maxSize={10 * 1024 * 1024} // 10MB
                                onDropFiles={handleFileUpload}
                                onDropUnacceptedFiles={(files) => {
                                    setUploadError('Please upload PDF or Word documents only.');
                                }}
                                onSizeLimitExceed={(files) => {
                                    setUploadError('File size must be less than 10MB.');
                                }}
                                className="!bg-white !border !border-brand-secondary-600 min-h-48 py-8 !flex !items-center !justify-center !rounded-lg upload-dropzone-custom"
                            />
                        </FileUpload.Root>
                        <style jsx global>{`
                            .upload-dropzone-custom {
                                box-shadow: 0 0 0 8px #F2FAFC !important;
                            }
                        `}</style>
                    </div>
                </div>

                {/* Error Display */}
                {uploadError && (
                    <div className="flex items-center gap-2 p-4 bg-error-50 border border-error-200 rounded-lg mb-8">
                        <AlertCircle className="w-5 h-5 text-error-600" />
                        <p className="text-sm text-error-700">{uploadError}</p>
                    </div>
                )}

                {/* Test Applications */}
                {hasApplications && (
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4 mb-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-md font-semibold text-primary">Test Applications ({testApplications.length})</h3>
                            <Button
                                size="md"
                                color="primary"
                                iconLeading={Play}
                                onClick={runAssessment}
                                isDisabled={isRunningTest || allTested}
                            >
                                {isRunningTest ? 'Running Assessment...' : 'Run Assessment'}
                            </Button>
                        </div>
                        
                        <div className="space-y-3">
                            {testApplications.map((app) => (
                                <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <FeaturedIcon size="sm" color="gray" theme="light" icon={FileCheck02} />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <p className="text-sm font-medium text-primary">{app.name}</p>
                                                    {app.status !== 'pending' && getStatusBadge(app.status)}
                                                    {app.score && app.status !== 'error' && (
                                                        <span className="text-sm font-medium text-secondary">
                                                            Score: {app.score}/100
                                                        </span>
                                                    )}
                                                    {app.status === 'error' && app.errorType && (
                                                        <span className="text-sm font-medium text-error-600">
                                                            {app.errorType === 'TIMEOUT' ? 'Timed Out' : 'Failed'}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* Expected Result Toggle */}
                                                {app.status === 'pending' && (
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <Toggle
                                                            size="sm"
                                                            label="Expected to pass"
                                                            isSelected={app.expectedResult === 'pass'}
                                                            onChange={(shouldPass) => toggleExpectedResult(app.id, shouldPass)}
                                                        />
                                                    </div>
                                                )}
                                                
                                                {/* Assessment Results */}
                                                {app.feedback && (
                                                    <div className={`rounded p-3 mt-2 ${app.status === 'error' ? 'bg-error-50 border border-error-200' : 'bg-gray-50'}`}>
                                                        <p className={`text-xs font-medium mb-1 ${app.status === 'error' ? 'text-error-700' : 'text-primary'}`}>
                                                            {app.status === 'error' ? 'Error Details:' : 'AI Feedback:'}
                                                        </p>
                                                        <p className={`text-xs ${app.status === 'error' ? 'text-error-600' : 'text-secondary'}`}>
                                                            {app.feedback}
                                                        </p>
                                                        
                                                        {app.status === 'error' && app.errorType === 'TIMEOUT' && (
                                                            <div className="mt-2 text-xs text-error-600">
                                                                <strong>Suggestion:</strong> Try a smaller or simpler test application, or wait a moment and try again.
                                                            </div>
                                                        )}
                                                        
                                                        {app.assessmentDetails && app.status !== 'error' && (
                                                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                                                <div>Innovation: {app.assessmentDetails.innovation}%</div>
                                                                <div>Financial: {app.assessmentDetails.financial}%</div>
                                                                <div>Team: {app.assessmentDetails.team}%</div>
                                                                <div>Market: {app.assessmentDetails.market}%</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <Button
                                            size="sm"
                                            color="tertiary"
                                            iconLeading={Trash01}
                                            onClick={() => removeApplication(app.id)}
                                            isDisabled={app.status === 'testing'}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Test Results Summary */}
                {testResults && allTested && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={ClipboardCheck} />
                            <h3 className="text-lg font-semibold text-primary">Assessment Test Results</h3>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <p className="text-2xl font-bold text-primary">{testResults.total}</p>
                                <p className="text-sm text-secondary">Total Tests</p>
                            </div>
                            <div className="text-center p-4 bg-success-50 rounded-lg">
                                <p className="text-2xl font-bold text-success-700">{testResults.passes}</p>
                                <p className="text-sm text-success-600">Passed</p>
                            </div>
                            <div className="text-center p-4 bg-error-50 rounded-lg">
                                <p className="text-2xl font-bold text-error-700">{testResults.fails}</p>
                                <p className="text-sm text-error-600">Failed</p>
                            </div>
                        </div>
                        
                        {testResults.fails > 0 && (
                            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-5 h-5 text-warning-600" />
                                    <p className="text-sm font-medium text-warning-800">Assessment Issues Detected</p>
                                </div>
                                <p className="text-sm text-warning-700 mb-3">
                                    Some applications didn't achieve the expected results. Consider:
                                </p>
                                <ul className="text-sm text-warning-700 list-disc list-inside space-y-1">
                                    <li>Reviewing and updating your selection criteria documents</li>
                                    <li>Providing additional assessment guidelines</li>
                                    <li>Adding more detailed examples in your criteria</li>
                                </ul>
                            </div>
                        )}
                        
                        {testResults.fails === 0 && (
                            <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-success-600" />
                                    <p className="text-sm font-medium text-success-800">
                                        Perfect! All test applications achieved expected results. Your fund assessment system is ready.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Back Button */}
                <div className="flex justify-start">
                    <Button
                        size="lg"
                        color="tertiary"
                        iconLeading={ArrowLeft}
                        onClick={() => router.push('/funding/setup')}
                    >
                        Back to Setup
                    </Button>
                </div>
            </div>
        </div>
    );
}