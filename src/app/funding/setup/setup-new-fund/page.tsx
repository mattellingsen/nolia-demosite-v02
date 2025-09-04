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
    FileCheck02,
    Target01,
    Stars01,
    Settings01,
    Eye,
    Code01
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
import { Step4AISuggestions } from "./components/step-4-ai-suggestions";
import { Step5TestAssessment } from "./components/step-5-test-assessment";
import { PreviewAndLaunch } from "./components/preview-and-launch";

type FormBuilderStep = 'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'preview';

interface FormBuilderState {
    applicationForm?: File;
    selectionCriteria: File[];
    goodExamples: File[];
    aiSuggestions?: any;
    parameters: {
        startDate?: string;
        endDate?: string;
        notificationSettings: {
            applicationCount?: number;
            fundingPercentage?: number;
        };
    };
}

const SetupNewFundPage = () => {
    const [currentStep, setCurrentStep] = useState<FormBuilderStep>('step1');
    const [formData, setFormData] = useState<FormBuilderState>({
        selectionCriteria: [],
        goodExamples: [],
        parameters: {
            notificationSettings: {}
        }
    });

    // Progress steps data for Untitled UI Progress component
    const progressSteps = [
        {
            title: 'Upload Form',
            description: 'Upload current application form',
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
            description: 'Upload example applications',
            status: getCurrentStepStatus('step3'),
            icon: Target01
        },
        {
            title: 'AI Suggestions',
            description: 'Review AI recommendations',
            status: getCurrentStepStatus('step4'),
            icon: Stars01
        },
        {
            title: 'Test Assessment',
            description: 'Test fund assessment',
            status: getCurrentStepStatus('step5'),
            icon: Settings01
        }
    ] as const;

    function getCurrentStepStatus(step: string) {
        const stepOrder = ['step1', 'step2', 'step3', 'step4', 'step5'];
        const currentIndex = stepOrder.indexOf(currentStep);
        const stepIndex = stepOrder.indexOf(step);
        
        if (stepIndex < currentIndex) return 'complete';
        if (stepIndex === currentIndex) return 'current';
        return 'incomplete';
    }

    const updateFormData = (updates: Partial<FormBuilderState>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleNextStep = () => {
        const stepOrder: FormBuilderStep[] = ['step1', 'step2', 'step3', 'step4', 'step5', 'preview'];
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
            setCurrentStep(stepOrder[currentIndex + 1]);
        }
    };

    const handlePreviousStep = () => {
        const stepOrder: FormBuilderStep[] = ['step1', 'step2', 'step3', 'step4', 'step5', 'preview'];
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(stepOrder[currentIndex - 1]);
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
                    <Step4AISuggestions
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNextStep}
                        onPrevious={handlePreviousStep}
                    />
                );
            
            case 'step5':
                return (
                    <Step5TestAssessment
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNextStep}
                        onPrevious={handlePreviousStep}
                    />
                );
            
            case 'preview':
                return (
                    <PreviewAndLaunch
                        formData={formData}
                        onPrevious={handlePreviousStep}
                        onSave={() => {
                            console.log('Saving form builder data:', formData);
                            alert('Form saved successfully!');
                        }}
                        onLaunch={() => {
                            console.log('Launching AI application form:', formData);
                            alert('AI Application Form is now live!');
                        }}
                    />
                );
        }
    };

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
                            href="/funding/setup"
                            className="self-start"
                        >
                            Back
                        </Button>
                        <div className="flex flex-col gap-1">
                            <p className="text-md font-semibold text-tertiary">AI Fund Setup</p>
                            <p className="text-display-md font-semibold text-primary">Setup New Fund</p>
                        </div>
                    </div>
                </div>

                {/* Progress Steps - Centered */}
                {currentStep !== 'preview' && (
                    <div className="flex justify-center px-4 lg:px-8">
                        <Progress.IconsWithText
                            type="featured-icon"
                            orientation="horizontal"
                            size="md"
                            items={progressSteps}
                            className="max-w-4xl"
                        />
                    </div>
                )}

                {/* Main Content */}
                <div className="px-4 lg:px-8">
                    {renderCurrentStepContent()}
                </div>
            </main>
            
            {/* Right Sidebar */}
            <div className="sticky top-0 hidden h-screen w-98 flex-col gap-8 overflow-auto border-l border-secondary bg-primary pb-12 lg:flex">
                <div className="flex flex-col gap-5 px-6 pt-6">
                    <div className="flex items-start justify-between">
                        <p className="text-lg font-semibold text-primary">Quick Actions</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 rounded-xl bg-utility-blue-50 p-4 hover:bg-utility-blue-100 cursor-pointer transition-colors"
                             onClick={() => setCurrentStep('preview')}>
                            <FeaturedIcon size="md" color="brand" theme="light" icon={Eye} className="bg-utility-blue-100 text-utility-blue-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-blue-700">Preview form</p>
                                <ArrowRight className="text-utility-blue-700 w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl bg-utility-purple-50 p-4 hover:bg-utility-purple-100 cursor-pointer transition-colors">
                            <FeaturedIcon size="md" color="brand" theme="light" icon={Code01} className="bg-utility-purple-100 text-utility-purple-700" />
                            <div className="flex flex-1 justify-between gap-4">
                                <p className="text-sm font-medium text-utility-purple-700">Get embed code</p>
                                <ArrowRight className="text-utility-purple-700 w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupNewFundPage;