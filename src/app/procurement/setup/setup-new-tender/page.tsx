"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    FileCheck02,
    Target01,
    Stars01,
    Settings01,
    Eye,
    Code01,
    CheckCircle,
    File02,
    TrendUp02
} from "@untitledui/icons";

import { Carousel } from "@/components/application/carousel/carousel-base";
import { CarouselIndicator } from "@/components/application/carousel/carousel.demo";
import { Progress } from "@/components/application/progress-steps/progress-steps";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

import { Step1UploadForm } from "./components/step-1-upload-form";
import { Step2SelectionCriteria } from "./components/step-2-selection-criteria";
import { Step3GoodExamples } from "./components/step-3-good-examples";
import { Step4OutputTemplates } from "./components/step-4-output-templates";

type FormBuilderStep = 'step1' | 'step2' | 'step3' | 'step4';

interface FormBuilderState {
    tenderName?: string;
    submissionForm?: File;
    submissionFormAnalysis?: any;
    selectionCriteria: File[];
    selectionCriteriaAnalysis?: any;
    outputTemplates: File[];
    outputTemplatesAnalysis?: any;
    goodExamples: File[];
    goodExamplesAnalysis?: any;
    aiSuggestions?: any;
    parameters: {
        startDate?: string;
        endDate?: string;
        notificationSettings: {
            submissionCount?: number;
            procurementPercentage?: number;
        };
    };
}

const SetupNewTenderPage = () => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<FormBuilderStep>('step1');
    const [formData, setFormData] = useState<FormBuilderState>({
        selectionCriteria: [],
        outputTemplates: [],
        goodExamples: [],
        parameters: {
            notificationSettings: {}
        }
    });

    // Progress steps data for Untitled UI Progress component
    const progressSteps = [
        {
            title: 'Upload Form',
            description: 'Upload current submission form',
            status: getCurrentStepStatus('step1'),
            icon: UploadCloud01
        },
        {
            title: 'Selection Criteria',
            description: 'Upload assessment criteria',
            status: getCurrentStepStatus('step2'),
            icon: FileCheck02
        },
        {
            title: 'Good Examples',
            description: 'Upload example submissions',
            status: getCurrentStepStatus('step3'),
            icon: Target01
        },
        {
            title: 'Output Templates',
            description: 'Upload output templates',
            status: getCurrentStepStatus('step4'),
            icon: File02
        }
    ] as const;

    function getCurrentStepStatus(step: string) {
        const stepOrder = ['step1', 'step2', 'step3', 'step4'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const stepIndex = stepOrder.indexOf(step);
        
        if (stepIndex < currentIndex) return 'complete';
        if (stepIndex === currentIndex) return 'current';
        return 'incomplete';
    }

    function getStepIcon(step: typeof progressSteps[0]) {
        if (step.status === 'complete') {
            return CheckCircle;
        }
        return step.icon;
    }

    function getStepIconColor(step: typeof progressSteps[0]) {
        if (step.status === 'complete') {
            return 'success';
        }
        if (step.status === 'current') {
            return 'brand';
        }
        return 'gray';
    }

    const updateFormData = (updates: Partial<FormBuilderState>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleNextStep = () => {
        const stepOrder: FormBuilderStep[] = ['step1', 'step2', 'step3', 'step4'];
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
            setCurrentStep(stepOrder[currentIndex + 1]);
        }
    };

    const handlePreviousStep = () => {
        const stepOrder: FormBuilderStep[] = ['step1', 'step2', 'step3', 'step4'];
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(stepOrder[currentIndex - 1]);
        }
    };

    const handleCreateFund = async () => {
        try {
            // Convert files to base64 for API
            const fileToBase64 = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                        const result = reader.result as string;
                        // Remove data:mime/type;base64, prefix
                        const base64 = result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                });
            };

            // Prepare tender data
            const tenderData: any = {
                name: formData.tenderName || 'Untitled Tender',
                description: 'AI-powered tender created through setup wizard'
            };

            // Add submission form if available
            if (formData.submissionForm) {
                const content = await fileToBase64(formData.submissionForm);
                tenderData.submissionFormFile = {
                    filename: formData.submissionForm.name,
                    mimeType: formData.submissionForm.type,
                    fileSize: formData.submissionForm.size,
                    content
                };
            }

            // Add selection criteria files
            if (formData.selectionCriteria?.length > 0) {
                tenderData.selectionCriteriaFiles = await Promise.all(
                    formData.selectionCriteria.map(async (file: File) => ({
                        filename: file.name,
                        mimeType: file.type,
                        fileSize: file.size,
                        content: await fileToBase64(file)
                    }))
                );
            }

            // Add good examples files
            if (formData.goodExamples?.length > 0) {
                tenderData.goodExamplesFiles = await Promise.all(
                    formData.goodExamples.map(async (file: File) => ({
                        filename: file.name,
                        mimeType: file.type,
                        fileSize: file.size,
                        content: await fileToBase64(file)
                    }))
                );
            }

            // Add output templates files
            if (formData.outputTemplates?.length > 0) {
                tenderData.outputTemplatesFiles = await Promise.all(
                    formData.outputTemplates.map(async (file: File) => ({
                        filename: file.name,
                        mimeType: file.type,
                        fileSize: file.size,
                        content: await fileToBase64(file)
                    }))
                );
            }

            // Call async tender creation API
            const response = await fetch('/api/tenders/create-async', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tenderData),
            });

            if (!response.ok) {
                throw new Error('Failed to create tender');
            }

            const result = await response.json();
            
            // Redirect to tender completion page
            router.push(`/procurement/tender-created?tenderId=${result.tender.id}`);

        } catch (error) {
            console.error('Error creating tender:', error);
            alert('Failed to create tender. Please try again.');
        }
    };

    const renderCurrentStepContent = () => {
        switch (currentStep) {
            case 'step1':
                return (
                    <Step1UploadForm 
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNextStep}
                    />
                );
            
            case 'step2':
                return (
                    <Step2SelectionCriteria
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNextStep}
                        onPrevious={handlePreviousStep}
                    />
                );
            
            case 'step3':
                return (
                    <Step3GoodExamples
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNextStep}
                        onPrevious={handlePreviousStep}
                    />
                );
            
            case 'step4':
                return (
                    <Step4OutputTemplates
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleCreateFund} // Create fund when completing final step
                        onPrevious={handlePreviousStep}
                    />
                );
        }
    };

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/procurement/setup"
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
                            href="/procurement/setup"
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back
                        </Button>
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-md font-semibold text-tertiary">AI Tender Setup</p>
                            <p className="text-display-md font-semibold text-primary">Setup New Tender</p>
                        </div>
                    </div>
                </div>


                {/* Progress Steps */}
                <div className="px-4 lg:px-8">
                    <div className="flex justify-center mb-8">
                        <Progress.IconsWithText
                            type="featured-icon"
                            orientation="horizontal"
                            size="md"
                            items={progressSteps}
                            className="max-w-5xl"
                        />
                    </div>
                </div>

                {/* Main Content */}
                <div className="px-4 lg:px-8">
                    {renderCurrentStepContent()}
                </div>
            </main>
            
            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex flex-col gap-5 px-6 pt-6">
                    {/* Helper box for users without forms */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <span className="font-semibold">Don't have a form yet? No problem!</span> You can start from scratch by describing your requirements in the next steps, and our AI will help you build one.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupNewTenderPage;