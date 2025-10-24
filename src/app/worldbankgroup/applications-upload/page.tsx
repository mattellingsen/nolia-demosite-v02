"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Clock } from "@untitledui/icons";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import {
    CheckDone01,
    Edit05,
    Send01,
    Plus,
    ArrowRight,
    Flash,
    UploadCloud01,
    Trash01,
    Monitor04,
    File02,
    Folder,
    TrendUp02,
} from "@untitledui/icons";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

import { Carousel } from "@/components/application/carousel/carousel-base";
import { CarouselIndicator } from "@/components/application/carousel/carousel.demo";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { Progress } from "@/components/application/progress-steps/progress-steps";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Badge } from "@/components/base/badges/badges";

import { UploadInterface } from "./components/upload-interface";
import { AssessmentProcessor, AssessmentResult } from "./components/assessment-processor";
import { AssessmentResults } from "./components/assessment-results";
import { useWorldBankGroupProjects } from "@/hooks/useWorldBankGroupProjects";
import { Dot } from "@/components/foundations/dot-icon";
import { extractOrganizationName, extractProjectTitle } from "@/app/worldbank/applications-upload/types/assessment";

type WorkflowStep = 'upload' | 'processing' | 'results';

const ApplicationsUploadPage = () => {
    const searchParams = useSearchParams();
    const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
    const [selectedProject, setSelectedProject] = useState<any>(null);

    // Progress simulation state
    const [simulatedProgress, setSimulatedProgress] = useState(2); // Start at 2%
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [assessmentFileSize, setAssessmentFileSize] = useState<number>(0);

    const { data: projects, isLoading: projectsLoading, error: projectsError } = useWorldBankGroupProjects();

    // Check if we're viewing a processing assessment
    useEffect(() => {
        const assessmentId = searchParams?.get('assessmentId');
        if (assessmentId) {
            // Set to processing state and fetch assessment details from API
            setCurrentStep('processing');

            // Fetch assessment details to get file size and created timestamp
            fetch(`/api/worldbankgroup-assessments/${assessmentId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.assessment) {
                        const assessment = data.assessment;

                        // Set file size
                        if (assessment.assessmentData?.fileSize) {
                            setAssessmentFileSize(assessment.assessmentData.fileSize);
                        }

                        // Set start time from server timestamp (when assessment was created)
                        if (assessment.createdAt) {
                            setStartTime(new Date(assessment.createdAt).getTime());
                        }

                        // Create a dummy file with the correct size
                        const filename = assessment.assessmentData?.evaluationReportFilename || 'processing-assessment.pdf';
                        const fileSize = assessment.assessmentData?.fileSize || 0;
                        const dummyFile = new File([''], filename, { type: 'application/pdf' });
                        Object.defineProperty(dummyFile, 'size', { value: fileSize });
                        setUploadedFiles([dummyFile]);
                    } else {
                        // Fallback to dummy file
                        const dummyFile = new File([''], 'processing-assessment.pdf', { type: 'application/pdf' });
                        setUploadedFiles([dummyFile]);
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch assessment details:', err);
                    const dummyFile = new File([''], 'processing-assessment.pdf', { type: 'application/pdf' });
                    setUploadedFiles([dummyFile]);
                });
        }
    }, [searchParams]);

    // Simulate progress: Calculate based on elapsed time from server timestamp
    useEffect(() => {
        if (currentStep !== 'processing') return;

        // Calculate initial progress based on elapsed time
        const calculateProgress = () => {
            const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);

            // Start at 2% and increase over time
            // Roughly 30 minutes to reach 95%
            let progress = 0;
            if (elapsedMinutes < 1) progress = 2;
            else if (elapsedMinutes < 5) progress = Math.min(10, 2 + (elapsedMinutes * 1.6));
            else if (elapsedMinutes < 10) progress = Math.min(20, 10 + ((elapsedMinutes - 5) * 2));
            else if (elapsedMinutes < 20) progress = Math.min(60, 20 + ((elapsedMinutes - 10) * 4));
            else if (elapsedMinutes < 30) progress = Math.min(95, 60 + ((elapsedMinutes - 20) * 3.5));
            else progress = 95; // Cap at 95%

            return Math.round(progress); // Round to whole number
        };

        // Set initial progress
        setSimulatedProgress(calculateProgress());

        // Update every 10 seconds
        const progressInterval = setInterval(() => {
            setSimulatedProgress(calculateProgress());
        }, 10000);

        return () => clearInterval(progressInterval);
    }, [currentStep, startTime]);

    // Calculate estimated time remaining based on simulated progress
    const getEstimatedTimeRemaining = () => {
        if (currentStep !== 'processing') return undefined;

        // Estimate based on progress: roughly 25-30 minutes total
        if (simulatedProgress < 30) return '25-30 minutes';
        if (simulatedProgress < 50) return '20-25 minutes';
        if (simulatedProgress < 70) return '15-20 minutes';
        if (simulatedProgress < 85) return '10-15 minutes';
        if (simulatedProgress < 95) return '5-10 minutes';
        return '2-5 minutes';
    };

    // Progress steps data for Untitled UI Progress component
    const progressSteps = [
        {
            title: 'Upload Submission',
            description: 'Upload your submission documents',
            status: currentStep === 'upload' ? 'current' : currentStep === 'processing' || currentStep === 'results' ? 'complete' : 'incomplete',
            icon: UploadCloud01
        },
        {
            title: 'AI Assessment',
            description: 'Automated assessment and scoring',
            status: currentStep === 'results' ? 'complete' : currentStep === 'processing' ? 'current' : 'incomplete',
            icon: File02
        }
    ] as const;

    const getStepIndex = (step: WorkflowStep): number => {
        switch (step) {
            case 'upload': return 0;
            case 'processing': return 0;
            case 'results': return 1;
            default: return 0;
        }
    };

    const handleFilesUploaded = async (files: FileList) => {
        const fileArray = Array.from(files);
        setUploadedFiles(fileArray);

        if (!selectedProject) {
            alert('No project selected');
            return;
        }

        // Upload file to S3 and create PROCESSING assessment
        try {
            const file = fileArray[0]; // For demo, we only handle single file
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', selectedProject.id);
            formData.append('projectName', selectedProject.name);

            const response = await fetch('/api/worldbankgroup-assessments/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Upload failed with status:', response.status, errorText);
                throw new Error(`Failed to upload file: ${response.status} - ${errorText.substring(0, 200)}`);
            }

            const result = await response.json();
            console.log('✅ File uploaded and assessment created:', result);

            // Move to processing state
            setCurrentStep('processing');
        } catch (error) {
            console.error('❌ Upload failed:', error);
            alert('Failed to upload file. Please try again.');
        }
    };

    const handleAssessmentComplete = (results: AssessmentResult[]) => {
        setAssessmentResults(results);
        setCurrentStep('results');
    };

    const handleSubmitToDatabase = async () => {

        if (!selectedProject || assessmentResults.length === 0) {
            alert('No project selected or no assessment results to save.');
            return;
        }

        try {
            console.log('[WorldBankGroup] Submitting assessments to database...');

            const savePromises = assessmentResults.map(async (result, index) => {

                // Extract real organization name and project title from assessment content
                const organizationName = extractOrganizationName(result);
                const projectName = extractProjectTitle(result);

                const assessmentData = {
                    projectId: selectedProject.id,
                    organizationName,
                    projectName,
                    assessmentType: 'AI_POWERED',
                    overallScore: result.rating,
                    scoringResults: {
                        overallScore: result.rating,
                        categories: result.categories,
                        summary: result.summary,
                        recommendations: result.recommendations
                    },
                    assessmentData: result
                };

                console.log('[WorldBankGroup] Submitting assessment:', assessmentData);

                const response = await fetch('/api/worldbankgroup-assessments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(assessmentData),
                });

                if (!response.ok) {
                    throw new Error(`Failed to save ${result.fileName}: ${response.statusText}`);
                }

                const savedAssessment = await response.json();
                return savedAssessment;
            });

            const savedAssessments = await Promise.all(savePromises);

            alert(`✅ ${savedAssessments.length} applications submitted successfully! (Fake demo - hardcoded assessment data)`);

            // Reset the workflow
            setCurrentStep('upload');
            setUploadedFiles([]);
            setAssessmentResults([]);

        } catch (error) {
            console.error('[WorldBankGroup] ❌ Error saving assessments:', error);
            alert(`❌ Error saving applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleBackToUpload = () => {
        setCurrentStep('upload');
        setUploadedFiles([]);
        setAssessmentResults([]);
    };

    const renderCurrentStepContent = () => {
        switch (currentStep) {
            case 'upload':
                return (
                    <div className="space-y-6">
                        {selectedProject && (
                            <div className="flex justify-center">
                                <div className="w-full max-w-2xl relative">
                                    {/* Upload Mode Toggle - positioned top right of uploader with dots */}
                                    <div className="absolute top-2 right-2 z-10">
                                        <ButtonGroup
                                            defaultSelectedKeys={[uploadMode]}
                                            selectionMode="single"
                                            size="sm"
                                            onSelectionChange={(keys) => {
                                                const selected = Array.from(keys)[0] as 'single' | 'bulk';
                                                if (selected) setUploadMode(selected);
                                            }}
                                        >
                                            <ButtonGroupItem id="single">Single Submission</ButtonGroupItem>
                                            <ButtonGroupItem id="bulk">Bulk Upload</ButtonGroupItem>
                                        </ButtonGroup>
                                    </div>

                                    <UploadInterface
                                        mode={uploadMode}
                                        onFilesUploaded={handleFilesUploaded}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'processing':
                return (
                    <div className="flex justify-center px-4">
                        <div className="w-full max-w-2xl">
                            <div className="rounded-xl border border-warning-300 bg-warning-50 p-8 shadow-xs">
                                <div className="flex flex-col items-center gap-6 text-center">
                                    <div className="text-warning-600 [&_svg]:text-warning-600 [&_svg_.stroke-fg-brand-primary]:stroke-warning-600">
                                        <LoadingIndicator type="line-spinner" size="lg" />
                                    </div>

                                    <div className="flex flex-col gap-2 w-full">
                                        <h3 className="text-lg font-semibold text-warning-900">
                                            Assessment Processing
                                        </h3>
                                        <p className="text-md text-warning-800">
                                            Your submission is being analysed against the project knowledge base.
                                        </p>

                                        {/* Progress Bar */}
                                        <div className="flex items-center gap-3 mt-4">
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm text-warning-700">Processing progress</span>
                                                    <span className="font-medium text-warning-900">{simulatedProgress}%</span>
                                                </div>
                                                <ProgressBar value={simulatedProgress} className="h-2 [&>div]:bg-warning-600" />
                                            </div>
                                        </div>

                                        {/* Time and File Size */}
                                        <div className="flex flex-col gap-2 mt-4">
                                            {getEstimatedTimeRemaining() && (
                                                <div className="flex items-center justify-center gap-2 text-sm text-warning-700">
                                                    <Clock className="h-4 w-4" />
                                                    <span>Estimated time remaining: {getEstimatedTimeRemaining()}</span>
                                                </div>
                                            )}
                                            <p className="text-sm text-warning-700">
                                                File size: <span className="font-semibold">{uploadedFiles[0] ? (uploadedFiles[0].size / (1024 * 1024)).toFixed(2) : '0.00'} MB</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full gap-3 mt-4">
                                        <Button
                                            size="md"
                                            color="secondary"
                                            iconLeading={ArrowLeft}
                                            href="/worldbankgroup/assess"
                                        >
                                            Back to Assessments
                                        </Button>
                                        <Button
                                            size="md"
                                            color="primary"
                                            isDisabled={true}
                                        >
                                            Submit Assessment
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'results':
                return (
                    <AssessmentResults
                        results={assessmentResults}
                        onSubmit={handleSubmitToDatabase}
                        onBackToUpload={handleBackToUpload}
                    />
                );
        }
    };

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/worldbankgroup/applications-upload"
                items={[
                    {
                        label: "Setup",
                        href: "/worldbankgroup/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Assess",
                        href: "/worldbankgroup/assess",
                        icon: CheckDone01,
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
                            href="/worldbankgroup/setup"
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back
                        </Button>
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-md font-semibold text-tertiary">World Bank Group Upload & Assess</p>
                            <p className="text-display-md font-semibold text-primary">Submissions Upload</p>
                        </div>
                    </div>
                </div>

                {/* Progress Steps - Centered */}
                <div className="flex justify-center px-4 lg:px-8">
                    <Progress.IconsWithText
                        type="featured-icon"
                        orientation="horizontal"
                        size="md"
                        items={progressSteps}
                        className="max-w-4xl"
                    />
                </div>

                {/* Project Selection - hide when processing */}
                {currentStep !== 'processing' && (
                    <div className="flex justify-center px-4 lg:px-8">
                        <div className="w-full max-w-md">
                            <div className="mb-4 text-center">
                                <p className="text-lg text-secondary">
                                    Select the project to assess against
                                </p>
                            </div>
                            <div className="relative select-custom">
                                {projectsError ? (
                                    <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-700">
                                        Failed to load projects. Please try refreshing the page.
                                    </div>
                                ) : projects && projects.length === 0 ? (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-sm text-blue-800">
                                            <strong>No projects available.</strong> You need to create a project first in the Setup section before uploading submissions.
                                        </p>
                                        <Button
                                            size="sm"
                                            color="primary"
                                            href="/worldbankgroup/setup"
                                            className="mt-2"
                                        >
                                            Go to Setup
                                        </Button>
                                    </div>
                                ) : (
                                    <Select
                                        placeholder={projectsLoading ? "Loading projects..." : "Select project"}
                                        size="md"
                                        items={projects ? projects.map(project => ({
                                            id: project.id,
                                            label: project.name,
                                            supportingText: project.status.toLowerCase()
                                        })) : []}
                                        placeholderIcon={Folder}
                                        className="w-full"
                                        isDisabled={projectsLoading || !projects || projects.length === 0}
                                        selectedKey={selectedProject?.id}
                                        onSelectionChange={(selectedId) => {
                                            if (selectedId) {
                                                const project = projects?.find(project => project.id === selectedId);
                                                setSelectedProject(project);
                                            }
                                        }}
                                    >
                                        {(item) => <Select.Item key={item.id}>{item.label}</Select.Item>}
                                    </Select>
                                )}
                                <style jsx global>{`
                                    .select-custom button {
                                        border: 1px solid #3497B8 !important;
                                        box-shadow: 0 0 0 8px #F2FAFC !important;
                                        border-radius: 0.5rem !important;
                                    }
                                    .select-custom button:focus {
                                        border: 1px solid #3497B8 !important;
                                        box-shadow: 0 0 0 8px #F2FAFC !important;
                                    }
                                `}</style>
                            </div>
                        </div>
                    </div>
                )}

                {/* Upload Instructions - only show when project is selected and not processing */}
                {selectedProject && currentStep !== 'processing' && (
                    <div className="flex justify-center px-4 lg:px-8">
                        <div className="w-full max-w-md">
                            <div className="text-center">
                                <p className="text-lg text-secondary">
                                    Upload document(s) to assess.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="px-4 lg:px-8">
                    {renderCurrentStepContent()}
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
                        <a href="/worldbankgroup/applications-upload" className="flex items-center gap-3 rounded-xl bg-utility-blue-50 p-4 hover:bg-utility-blue-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={UploadCloud01} className="bg-utility-blue-100 text-utility-blue-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-blue-700">Upload submissions</p>
                                <ArrowRight className="text-utility-blue-700 w-4 h-4" />
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationsUploadPage;
