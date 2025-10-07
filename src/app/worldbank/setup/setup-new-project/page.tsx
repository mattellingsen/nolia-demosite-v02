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
    projectName?: string;
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
    const [isCreating, setIsCreating] = useState(false);
    const [creationStep, setCreationStep] = useState('');
    const [creationProgress, setCreationProgress] = useState(0);
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
            title: 'Pre-RFP Documents',
            description: 'Upload business case & context',
            status: getCurrentStepStatus('step1'),
            icon: UploadCloud01
        },
        {
            title: 'RFP Document',
            description: 'Upload the RFP itself',
            status: getCurrentStepStatus('step2'),
            icon: FileCheck02
        },
        {
            title: 'Supporting Documents',
            description: 'Upload rubrics, Q&A, forms',
            status: getCurrentStepStatus('step3'),
            icon: Target01
        },
        {
            title: 'Output Templates',
            description: 'Upload assessment templates',
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
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚀 DEBUG: handleCreateFund() called');
            console.log('🚀 DEBUG: formData.projectName:', formData.projectName);
            console.log('🚀 DEBUG: formData.submissionForm:', formData.submissionForm);
            console.log('🚀 DEBUG: formData.selectionCriteria:', formData.selectionCriteria?.length || 0, 'files');
            console.log('🚀 DEBUG: formData.goodExamples:', formData.goodExamples?.length || 0, 'files');
            console.log('🚀 DEBUG: formData.outputTemplates:', formData.outputTemplates?.length || 0, 'files');

            const totalFiles = (formData.submissionForm ? 1 : 0) +
                             (formData.selectionCriteria?.length || 0) +
                             (formData.goodExamples?.length || 0) +
                             (formData.outputTemplates?.length || 0);

            console.log('🚀 DEBUG: Total files to upload:', totalFiles);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            setIsCreating(true);
            setCreationStep('Preparing documents...');
            setCreationProgress(10);

            // Convert files to base64 for API
            const fileToBase64 = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                        const result = reader.result as string;
                        // Remove data:mime/type;base64, prefix
                        const base64 = result.split(',')[1];
                        console.log(`📄 DEBUG: Converted ${file.name} to base64, length: ${base64?.length || 0}`);
                        resolve(base64);
                    };
                    reader.onerror = (error) => {
                        console.error(`❌ DEBUG: Failed to read ${file.name}:`, error);
                        reject(error);
                    };
                });
            };

            setCreationStep('Converting documents...');
            setCreationProgress(25);

            // Prepare project data (4-step structure matching API)
            const tenderData: any = {
                name: formData.projectName || 'Untitled Project',
                description: 'Project-specific project knowledgebase',
                moduleType: 'PROCUREMENT' // Critical: Must be PROCUREMENT
            };

            console.log('📦 DEBUG: Project data prepared:', {
                name: tenderData.name,
                description: tenderData.description,
                moduleType: tenderData.moduleType
            });

            let currentProgress = 25;
            const progressIncrement = totalFiles > 0 ? (45 / totalFiles) : 0;

            // Step 1: Pre-RFP documents (business case, etc.) → APPLICATION_FORM
            if (formData.submissionForm) {
                setCreationStep('Processing Pre-RFP documents...');
                const content = await fileToBase64(formData.submissionForm);
                tenderData.preRfpFiles = [{
                    filename: formData.submissionForm.name,
                    mimeType: formData.submissionForm.type,
                    fileSize: formData.submissionForm.size,
                    content
                }];
                currentProgress += progressIncrement;
                setCreationProgress(Math.round(currentProgress));
            }

            // Step 2: RFP document itself → SELECTION_CRITERIA
            if (formData.selectionCriteria?.length > 0) {
                setCreationStep(`Processing RFP documents (${formData.selectionCriteria.length} files)...`);
                tenderData.rfpFiles = await Promise.all(
                    formData.selectionCriteria.map(async (file: File, index: number) => {
                        const content = await fileToBase64(file);
                        currentProgress += progressIncrement;
                        setCreationProgress(Math.round(currentProgress));
                        return {
                            filename: file.name,
                            mimeType: file.type,
                            fileSize: file.size,
                            content
                        };
                    })
                );
            }

            // Step 3: Supporting RFP docs (rubrics, Q&A, etc.) → GOOD_EXAMPLES
            if (formData.goodExamples?.length > 0) {
                setCreationStep(`Processing supporting documents (${formData.goodExamples.length} files)...`);
                tenderData.supportingFiles = await Promise.all(
                    formData.goodExamples.map(async (file: File) => {
                        const content = await fileToBase64(file);
                        currentProgress += progressIncrement;
                        setCreationProgress(Math.round(currentProgress));
                        return {
                            filename: file.name,
                            mimeType: file.type,
                            fileSize: file.size,
                            content
                        };
                    })
                );
            }

            // Step 4: Output templates → OUTPUT_TEMPLATES
            if (formData.outputTemplates?.length > 0) {
                setCreationStep(`Processing output templates (${formData.outputTemplates.length} files)...`);
                tenderData.outputTemplatesFiles = await Promise.all(
                    formData.outputTemplates.map(async (file: File) => {
                        const content = await fileToBase64(file);
                        currentProgress += progressIncrement;
                        setCreationProgress(Math.round(currentProgress));
                        return {
                            filename: file.name,
                            mimeType: file.type,
                            fileSize: file.size,
                            content
                        };
                    })
                );
            }

            setCreationStep('Uploading to cloud...');
            setCreationProgress(70);

            console.log('📤 DEBUG: About to send API request');
            console.log('📤 DEBUG: Payload summary:', {
                name: tenderData.name,
                description: tenderData.description,
                moduleType: tenderData.moduleType,
                preRfpFilesCount: tenderData.preRfpFiles?.length || 0,
                rfpFilesCount: tenderData.rfpFiles?.length || 0,
                supportingFilesCount: tenderData.supportingFiles?.length || 0,
                outputTemplatesFilesCount: tenderData.outputTemplatesFiles?.length || 0
            });

            // Call async project creation API
            const response = await fetch('/api/worldbank-projects/create-async', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tenderData),
            });

            console.log('📥 DEBUG: API response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ DEBUG: API error response:', errorData);
                throw new Error(`Failed to create project: ${errorData.error || response.statusText}`);
            }

            setCreationStep('Finalizing project...');
            setCreationProgress(90);

            const result = await response.json();
            console.log('✅ DEBUG: API success response:', result);

            setCreationStep('Complete!');
            setCreationProgress(100);

            // Small delay to show completion state
            await new Promise(resolve => setTimeout(resolve, 500));

            // Redirect to project completion page
            router.push(`/worldbank/project-created?projectId=${result.project.id}`);

        } catch (error) {
            console.error('Error creating project:', error);
            setIsCreating(false);
            alert('Failed to create project. Please try again.');
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
        <>
            {/* Creation Progress Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg border border-secondary bg-primary p-8 shadow-xl">
                        <div className="flex flex-col items-center gap-6">
                            <FeaturedIcon
                                size="xl"
                                color="brand"
                                theme="light"
                                icon={creationProgress === 100 ? CheckCircle : UploadCloud01}
                                className={creationProgress < 100 ? "animate-pulse" : ""}
                            />

                            <div className="w-full space-y-3">
                                <h3 className="text-center text-lg font-semibold text-primary">
                                    {creationProgress === 100 ? 'Project Created!' : 'Creating Project'}
                                </h3>
                                <p className="text-center text-sm text-secondary">
                                    {creationStep}
                                </p>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-tertiary">Progress</span>
                                        <span className="font-medium text-primary">{creationProgress}%</span>
                                    </div>
                                    <ProgressBar value={creationProgress} className="h-2" />
                                </div>
                            </div>

                            {creationProgress < 100 && (
                                <p className="text-center text-xs text-tertiary">
                                    Please wait while we process your documents and set up the project knowledge base...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col bg-primary lg:flex-row">
                <SidebarNavigationSlim
                activeUrl="/worldbank/setup"
                items={[
                    {
                        label: "Setup",
                        href: "/worldbank/setup",
                        icon: Edit05,
                    },
                    {
                        label: "Apply",
                        href: "/worldbank/apply",
                        icon: Send01,
                    },
                    {
                        label: "Assess",
                        href: "/worldbank/assess",
                        icon: CheckDone01,
                    },
                    {
                        label: "Analytics",
                        href: "/worldbank/analytics",
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
                            href="/worldbank/setup"
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back
                        </Button>
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-md font-semibold text-tertiary">AI Project Setup</p>
                            <p className="text-display-md font-semibold text-primary">Setup New Project</p>
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
        </>
    );
};

export default SetupNewTenderPage;