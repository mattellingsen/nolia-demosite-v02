"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@untitledui/icons";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Button } from "@/components/base/buttons/button";
import { Edit05 } from "@untitledui/icons";
import { Settings01 } from "@untitledui/icons";
import { ArrowRight } from "@untitledui/icons";
import { UploadCloud01 } from "@untitledui/icons";
import { FileCheck02 } from "@untitledui/icons";
import { File02 } from "@untitledui/icons";
import { CheckCircle } from "@untitledui/icons";
import { Shield01 } from "@untitledui/icons";
import { Building02 } from "@untitledui/icons";
import { BookOpen01 } from "@untitledui/icons";

import { Progress } from "@/components/application/progress-steps/progress-steps";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

import { Step1UploadPolicies } from "./components/step-1-upload-policies";
import { Step2ComplianceDocs } from "./components/step-2-compliance-docs";
import { Step3StandardTemplates } from "./components/step-3-standard-templates";
import { Step4GovernanceRules } from "./components/step-4-governance-rules";

// Disable static generation to fix build issues
export const dynamic = 'force-dynamic';

type FormBuilderStep = 'step1' | 'step2' | 'step3' | 'step4';

interface FormBuilderState {
    baseName?: string;
    description?: string;
    policies: File[];
    policiesAnalysis?: any;
    complianceDocs: File[];
    complianceDocsAnalysis?: any;
    standardTemplates: File[];
    standardTemplatesAnalysis?: any;
    governanceRules: File[];
    governanceRulesAnalysis?: any;
    parameters: {
        effectiveDate?: string;
        reviewCycle?: string;
        notificationSettings: {
            updateFrequency?: string;
            reviewReminders?: boolean;
        };
    };
}

const SetupProcurementBasePage = () => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<FormBuilderStep>('step1');
    const [formData, setFormData] = useState<FormBuilderState>({
        policies: [],
        complianceDocs: [],
        standardTemplates: [],
        governanceRules: [],
        parameters: {
            notificationSettings: {}
        }
    });

    // Progress steps data for Untitled UI Progress component
    const progressSteps = [
        {
            title: 'Upload Policies',
            description: 'Company procurement policies',
            status: getCurrentStepStatus('step1'),
            icon: BookOpen01
        },
        {
            title: 'Compliance Documents',
            description: 'Regulatory requirements',
            status: getCurrentStepStatus('step2'),
            icon: Shield01
        },
        {
            title: 'Standard Templates',
            description: 'Reusable templates',
            status: getCurrentStepStatus('step3'),
            icon: File02
        },
        {
            title: 'Governance Rules',
            description: 'Approval workflows',
            status: getCurrentStepStatus('step4'),
            icon: Settings01
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

    const handleCreateBase = async () => {
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

            // Prepare base data
            const baseData: any = {
                name: formData.baseName || 'Untitled Procurement Base',
                description: formData.description || 'Company-wide procurement standards and templates',
                moduleType: 'PROCUREMENT_ADMIN'
            };

            // Add policy files
            if (formData.policies?.length > 0) {
                baseData.policyFiles = await Promise.all(
                    formData.policies.map(async (file: File) => ({
                        filename: file.name,
                        mimeType: file.type,
                        fileSize: file.size,
                        content: await fileToBase64(file)
                    }))
                );
            }

            // Add compliance docs
            if (formData.complianceDocs?.length > 0) {
                baseData.complianceFiles = await Promise.all(
                    formData.complianceDocs.map(async (file: File) => ({
                        filename: file.name,
                        mimeType: file.type,
                        fileSize: file.size,
                        content: await fileToBase64(file)
                    }))
                );
            }

            // Add standard templates
            if (formData.standardTemplates?.length > 0) {
                baseData.templateFiles = await Promise.all(
                    formData.standardTemplates.map(async (file: File) => ({
                        filename: file.name,
                        mimeType: file.type,
                        fileSize: file.size,
                        content: await fileToBase64(file)
                    }))
                );
            }

            // Add governance rules
            if (formData.governanceRules?.length > 0) {
                baseData.governanceFiles = await Promise.all(
                    formData.governanceRules.map(async (file: File) => ({
                        filename: file.name,
                        mimeType: file.type,
                        fileSize: file.size,
                        content: await fileToBase64(file)
                    }))
                );
            }

            // Call async base creation API
            const response = await fetch('/api/procurement-base/create-async', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(baseData),
            });

            if (!response.ok) {
                throw new Error('Failed to create procurement base');
            }

            const result = await response.json();

            // Redirect to base completion page
            router.push(`/procurement-admin/base-created?baseId=${result.base.id}`);

        } catch (error) {
            console.error('Error creating procurement base:', error);
            alert('Failed to create procurement base. Please try again.');
        }
    };

    const renderCurrentStepContent = () => {
        switch (currentStep) {
            case 'step1':
                return (
                    <Step1UploadPolicies
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNextStep}
                    />
                );

            case 'step2':
                return (
                    <Step2ComplianceDocs
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNextStep}
                        onPrevious={handlePreviousStep}
                    />
                );

            case 'step3':
                return (
                    <Step3StandardTemplates
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleNextStep}
                        onPrevious={handlePreviousStep}
                    />
                );

            case 'step4':
                return (
                    <Step4GovernanceRules
                        formData={formData}
                        updateFormData={updateFormData}
                        onNext={handleCreateBase} // Create base when completing final step
                        onPrevious={handlePreviousStep}
                    />
                );
        }
    };

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/procurement-admin/setup"
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
                            Back
                        </Button>
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-md font-semibold text-tertiary">Procurement Admin</p>
                            <p className="text-display-md font-semibold text-primary">Setup Procurement Base</p>
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
                    {/* Helper box for admins */}
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-800">
                            <span className="font-semibold">Setting up company standards?</span> Upload your organization's procurement policies, compliance requirements, and standard templates. These will form the foundation for all procurement activities.
                        </p>
                    </div>

                    {/* Info cards */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Building02} color="gray" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Organization-Wide</p>
                                <p className="text-xs text-tertiary mt-1">These documents will apply to all procurement processes across your organization</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Shield01} color="success" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Compliance Ready</p>
                                <p className="text-xs text-tertiary mt-1">Ensure all procurement activities meet regulatory requirements</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={FileCheck02} color="brand" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Reusable Templates</p>
                                <p className="text-xs text-tertiary mt-1">Standard templates can be used across multiple procurement projects</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupProcurementBasePage;