"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCreateFund } from "@/hooks/useFunds";
import { 
    UploadCloud01, 
    ArrowRight, 
    ArrowLeft, 
    CheckCircle, 
    AlertCircle, 
    XClose, 
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
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { runTestAssessmentViaAPI } from "@/lib/api-client";

interface Step5Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}

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

export const Step5TestAssessment: React.FC<Step5Props> = ({ 
    formData, 
    updateFormData, 
    onNext,
    onPrevious
}) => {
    const router = useRouter();
    const createFund = useCreateFund();
    const [testApplications, setTestApplications] = useState<TestApplication[]>([]);
    const [isRunningTest, setIsRunningTest] = useState(false);
    const [uploadError, setUploadError] = useState<string>('');
    const [testResults, setTestResults] = useState<{passes: number; fails: number; total: number} | null>(null);
    const [isCreatingFund, setIsCreatingFund] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showUploadModal, setShowUploadModal] = useState(false);

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
        if (testApplications.length === 0) return;
        
        setIsRunningTest(true);
        
        // Get the selection criteria from form data for assessment context
        const criteria = formData.selectionCriteriaAnalysis;
        
        // Run real AI assessment for each application
        for (const app of testApplications) {
            // Update status to testing
            setTestApplications(prev => prev.map(a => 
                a.id === app.id ? { ...a, status: 'testing' } : a
            ));
            
            try {
                // Call real assessment API
                const assessmentResult = await runTestAssessmentViaAPI(app.file, criteria);
                
                // Map API response to our component's expected format
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
    const canContinue = hasApplications && allTested && testResults;

    const handleCompleteFund = async () => {
        if (!formData.fundName || !formData.applicationForm) {
            alert('Missing required fund data');
            return;
        }

        setIsCreatingFund(true);
        setShowUploadModal(true);
        setUploadProgress(0);
        
        try {
            // Calculate total number of files
            const totalFiles = 1 + // application form
                (formData.selectionCriteria?.length || 0) + 
                (formData.goodExamples?.length || 0);
            
            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90; // Hold at 90% until actual completion
                    }
                    return prev + Math.random() * 15; // Random increments for realistic feel
                });
            }, 500);
            
            const fundData = {
                fundName: formData.fundName,
                description: `AI-powered fund created through setup wizard`,
                applicationForm: formData.applicationForm,
                applicationFormAnalysis: formData.applicationFormAnalysis,
                selectionCriteria: formData.selectionCriteria,
                selectionCriteriaAnalysis: formData.selectionCriteriaAnalysis,
                goodExamples: formData.goodExamples,
                goodExamplesAnalysis: formData.goodExamplesAnalysis,
            };

            await createFund.mutateAsync(fundData);
            
            // Complete the progress
            clearInterval(progressInterval);
            setUploadProgress(100);
            
            // Brief delay to show completion
            setTimeout(() => {
                setShowUploadModal(false);
                router.push('/funding/setup');
            }, 500);
            
        } catch (error) {
            console.error('Error creating fund:', error);
            setShowUploadModal(false);
            alert('Failed to create fund. Please try again.');
        } finally {
            setIsCreatingFund(false);
        }
    };

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
        <>
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div>
                    <h2 className="text-display-sm font-semibold text-primary mb-2">
                        Test Assessment System
                    </h2>
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        Upload 3 test applications to validate that your fund assessment system works correctly. 
                        These should be applications you know the expected outcome for.
                    </p>
                </div>
            </div>

            {/* Upload Area */}
            <div className="flex justify-center">
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
                <div className="flex items-center gap-2 p-4 bg-error-50 border border-error-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-error-600" />
                    <p className="text-sm text-error-700">{uploadError}</p>
                </div>
            )}

            {/* Test Applications */}
            {hasApplications && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
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
                <div className="bg-white rounded-lg border border-gray-200 p-6">
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

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <div className="flex items-center gap-4">
                    <Button
                        size="lg"
                        color="tertiary"
                        iconLeading={ArrowLeft}
                        onClick={onPrevious}
                    >
                        Previous
                    </Button>
                    <div className="text-sm text-secondary">
                        Step 5 of 5
                    </div>
                </div>
                
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={handleCompleteFund}
                    isDisabled={!canContinue || isCreatingFund}
                >
                    {isCreatingFund ? 'Creating Fund...' : 'Complete Fund Setup'}
                </Button>
            </div>

        </div>

        {/* Upload Progress Modal */}
        {showUploadModal && (
            <ModalOverlay isOpen isDismissable={false}>
                <Modal className="max-w-md">
                    <Dialog>
                        {/* Modal Card Container */}
                        <div className="relative overflow-hidden rounded-xl bg-primary shadow-xl ring-1 ring-gray-950/5">
                            {/* Modal Content */}
                            <div className="flex flex-col items-center justify-center space-y-6 p-8">
                                {/* Optional Icon/Header Area */}
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                                    <UploadCloud01 className="h-6 w-6 text-brand-600" />
                                </div>
                                
                                {/* Title */}
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-primary">
                                        Uploading Documents
                                    </h3>
                                    <p className="mt-1 text-sm text-secondary">
                                        Please wait while we upload your files to the server
                                    </p>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-full">
                                    <ProgressBar 
                                        value={uploadProgress} 
                                        min={0} 
                                        max={100}
                                        labelPosition="right"
                                        className="w-full"
                                    />
                                </div>
                                
                                {/* File count indicator */}
                                <p className="text-center text-sm text-tertiary">
                                    {uploadProgress < 100 
                                        ? `Processing ${1 + (formData.selectionCriteria?.length || 0) + (formData.goodExamples?.length || 0)} files...`
                                        : '✓ Upload complete!'
                                    }
                                </p>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        )}
        </>
    );
};