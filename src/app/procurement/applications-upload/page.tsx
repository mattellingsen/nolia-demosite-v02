"use client";

import { useState } from "react";
import { ArrowLeft } from "@untitledui/icons";
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

import { Carousel } from "@/components/application/carousel/carousel-base";
import { CarouselIndicator } from "@/components/application/carousel/carousel.demo";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { Progress } from "@/components/application/progress-steps/progress-steps";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

import { UploadInterface } from "./components/upload-interface";
import { AssessmentProcessor, AssessmentResult } from "./components/assessment-processor";
import { AssessmentResults } from "./components/assessment-results";
import { useTenders } from "@/hooks/useTenders";
import { Dot } from "@/components/foundations/dot-icon";
import { extractOrganizationName, extractProjectTitle } from "./types/assessment";

type WorkflowStep = 'upload' | 'processing' | 'results';

const ApplicationsUploadPage = () => {
    const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
    const [selectedTender, setSelectedTender] = useState<any>(null);

    const { data: tenders, isLoading: tendersLoading, error: tendersError } = useTenders();

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

    const handleFilesUploaded = (files: FileList) => {
        const fileArray = Array.from(files);
        setUploadedFiles(fileArray);
        setCurrentStep('processing');
    };

    const handleAssessmentComplete = (results: AssessmentResult[]) => {
        setAssessmentResults(results);
        setCurrentStep('results');
    };

    const handleSubmitToDatabase = async () => {

        if (!selectedTender || assessmentResults.length === 0) {
            alert('No tender selected or no assessment results to save.');
            return;
        }

        try {

            const savePromises = assessmentResults.map(async (result, index) => {

                // Extract real organization name and project title from assessment content
                const organizationName = extractOrganizationName(result);
                const projectName = extractProjectTitle(result);

                const assessmentData = {
                    tenderId: selectedTender.id,
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


                const response = await fetch('/api/assessments', {
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

            alert(`✅ ${savedAssessments.length} applications submitted successfully! You can now view them in the Assessment page.`);

            // Reset the workflow
            setCurrentStep('upload');
            setUploadedFiles([]);
            setAssessmentResults([]);

        } catch (error) {
            console.error('❌ Error saving assessments:', error);
            alert(`❌ Error saving applications: ${error.message}`);
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
                        {selectedTender && (
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
                    <AssessmentProcessor
                        files={uploadedFiles}
                        selectedTender={selectedTender}
                        onAssessmentComplete={handleAssessmentComplete}
                    />
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
                activeUrl="/procurement/assess"
                items={[
                    {
                        label: "Setup",
                        href: "/procurement/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Apply",
                        href: "/procurement/apply",
                        icon: Send01,
                    },
                    {
                        label: "Assess",
                        href: "/procurement/assess",
                        icon: CheckDone01,
                    },
                    {
                        label: "Analytics",
                        href: "/procurement/analytics",
                        icon: TrendUp02,
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
                            href="/procurement"
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back
                        </Button>
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-md font-semibold text-tertiary">Upload & Assess</p>
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

                {/* Fund Selection */}
                <div className="flex justify-center px-4 lg:px-8">
                    <div className="w-full max-w-md">
                        <div className="mb-4 text-center">
                            <p className="text-lg text-secondary">
                                Select the tender to assess against
                            </p>
                        </div>
                        <div className="relative select-custom">
                            {tendersError ? (
                                <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-700">
                                    Failed to load tenders. Please try refreshing the page.
                                </div>
                            ) : tenders && tenders.length === 0 ? (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>No tenders available.</strong> You need to create a tender first in the Setup section before uploading submissions.
                                    </p>
                                    <Button
                                        size="sm"
                                        color="primary"
                                        href="/procurement/setup"
                                        className="mt-2"
                                    >
                                        Go to Setup
                                    </Button>
                                </div>
                            ) : (
                                <Select
                                    placeholder={tendersLoading ? "Loading tenders..." : "Select tender"}
                                    size="md"
                                    items={tenders ? tenders.map(tender => ({
                                        id: tender.id,
                                        label: tender.name,
                                        supportingText: tender.status.toLowerCase()
                                    })) : []}
                                    placeholderIcon={Folder}
                                    className="w-full"
                                    isDisabled={tendersLoading || !tenders || tenders.length === 0}
                                    selectedKey={selectedTender?.id}
                                    onSelectionChange={(selectedId) => {
                                        if (selectedId) {
                                            const tender = tenders?.find(tender => tender.id === selectedId);
                                            setSelectedTender(tender);
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

                {/* Upload Instructions - only show when fund is selected */}
                {selectedTender && (
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
                <div className="flex shrink-0 flex-col gap-5 overflow-x-clip px-6 pt-8">
                    <div className="flex justify-between">
                        <p className="text-lg font-semibold text-primary">Our tenders</p>
                        <Button size="md" color="link-gray" iconLeading={Plus}>
                            Add tender
                        </Button>
                    </div>
                    <Carousel.Root className="flex flex-col gap-5">
                        <Carousel.Content overflowHidden={false} className="gap-5">
                            <Carousel.Item className="basis-auto">
                                <div className="w-68 h-40 relative flex">
                                    <div className="w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl p-4 bg-linear-to-b from-[#A5C0EE] to-[#FBC5EC] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset">
                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1/2 bg-gray-800 rounded-b-2xl"></div>

                                        <div className="relative flex items-center justify-between px-1 pt-1">
                                            <div className="text-md leading-[normal] font-semibold text-white">New to R&D</div>
                                            <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} className="text-white hover:text-gray-200 !bg-transparent !border-0" />
                                        </div>

                                        <div className="relative flex items-end justify-between gap-3">
                                            <div className="flex min-w-0 flex-col gap-2">
                                                <p className="text-xs leading-snug font-semibold text-white" style={{wordBreak: "break-word"}}>
                                                    Kick start your first commercial research and development (R&D) project.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Carousel.Item>
                            <Carousel.Item className="basis-auto">
                                <div className="w-68 h-40 relative flex">
                                    <div className="w-full h-full flex flex-col justify-between overflow-hidden rounded-2xl p-4 bg-linear-to-b from-[#FBC2EB] to-[#A18CD1] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset">
                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1/2 bg-gray-800 rounded-b-2xl"></div>

                                        <div className="relative flex items-center justify-between px-1 pt-1">
                                            <div className="text-md leading-[normal] font-semibold text-white">Student Experience</div>
                                            <ButtonUtility size="xs" color="tertiary" tooltip="Delete" icon={Trash01} className="text-white hover:text-gray-200 !bg-transparent !border-0" />
                                        </div>

                                        <div className="relative flex items-end justify-between gap-3">
                                            <div className="flex min-w-0 flex-col gap-2">
                                                <p className="text-xs leading-snug font-semibold text-white" style={{wordBreak: "break-word"}}>
                                                    Fund innovative businesses to employ tertiary-level students.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Carousel.Item>
                        </Carousel.Content>

                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between gap-4">
                                    <p className="text-sm font-medium text-primary">This month</p>
                                    <span className="text-sm text-tertiary">240 Submissions</span>
                                </div>
                                <ProgressBar value={60} />
                            </div>
                            <CarouselIndicator size="lg" framed={false} />
                        </div>
                    </Carousel.Root>
                </div>

                <div className="flex flex-col gap-5 border-t border-secondary px-6 pt-6">
                    <div className="flex items-start justify-between">
                        <p className="text-lg font-semibold text-primary">Actions</p>
                        <TableRowActionsDropdown />
                    </div>
                    <div className="flex flex-col gap-3">
                        <a href="/procurement/applications-upload" className="flex items-center gap-3 rounded-xl bg-utility-blue-50 p-4 hover:bg-utility-blue-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={UploadCloud01} className="bg-utility-blue-100 text-utility-blue-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-blue-700">Upload submissions</p>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationsUploadPage;