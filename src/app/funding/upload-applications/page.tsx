"use client";

import { useState } from "react";
import { ArrowLeft } from "@untitledui/icons";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Button } from "@/components/base/buttons/button";
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

type WorkflowStep = 'upload' | 'processing' | 'results';

const UploadApplicationsPage = () => {
    const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);

    // Progress steps data for Untitled UI Progress component
    const progressSteps = [
        {
            title: 'Upload Application',
            description: 'Upload your application documents',
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

    const handleSubmitToDatabase = () => {
        // Here you would normally send results to your backend
        console.log('Submitting results to database:', assessmentResults);
        alert('Applications submitted successfully! You can now view them in the Assessment page.');
        
        // Reset the workflow
        setCurrentStep('upload');
        setUploadedFiles([]);
        setAssessmentResults([]);
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
                        <UploadInterface 
                            mode={uploadMode} 
                            onFilesUploaded={handleFilesUploaded}
                        />
                        
                        {/* Upload Mode Toggle - moved under uploader */}
                        <div className="flex justify-center">
                            <ButtonGroup 
                                defaultSelectedKeys={[uploadMode]} 
                                selectionMode="single"
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0] as 'single' | 'bulk';
                                    if (selected) setUploadMode(selected);
                                }}
                            >
                                <ButtonGroupItem id="single">Single Application</ButtonGroupItem>
                                <ButtonGroupItem id="bulk">Bulk Upload</ButtonGroupItem>
                            </ButtonGroup>
                        </div>
                    </div>
                );
            
            case 'processing':
                return (
                    <AssessmentProcessor 
                        files={uploadedFiles}
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
                activeUrl="/funding/assess"
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
                            href="/funding"
                            className="self-start"
                        >
                            Back
                        </Button>
                        <div className="flex flex-col gap-1">
                            <p className="text-md font-semibold text-tertiary">Upload & Assess</p>
                            <p className="text-display-md font-semibold text-primary">Application Upload</p>
                        </div>
                    </div>
                </div>

                {/* Progress Steps - Centered */}
                <div className="flex justify-center px-4 lg:px-8">
                    <Progress.IconsWithText
                        type="number"
                        orientation="horizontal"
                        size="md"
                        items={progressSteps}
                        className="max-w-md"
                    />
                </div>

                {/* Main Content */}
                <div className="px-4 lg:px-8">
                    {renderCurrentStepContent()}
                </div>
            </main>
            
            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex shrink-0 flex-col gap-5 overflow-x-clip px-6 pt-8">
                    <div className="flex justify-between">
                        <p className="text-lg font-semibold text-primary">Our funds</p>
                        <Button size="md" color="link-gray" iconLeading={Plus}>
                            Add fund
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
                                    <span className="text-sm text-tertiary">240 Applications</span>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadApplicationsPage;