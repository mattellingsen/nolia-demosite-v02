"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit05, Settings01, FileCheck02, Shield01, Building02, BookOpen01, UploadCloud01, CheckCircle, Database02 } from "@untitledui/icons";
import { SidebarNavigationSlim } from "@/components/application/app-navigation/sidebar-navigation/sidebar-slim";
import { Button } from "@/components/base/buttons/button";

import { Progress } from "@/components/application/progress-steps/progress-steps";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";

import { Step1UploadPolicies } from "./components/step-1-upload-policies";

// Disable static generation to fix build issues
export const dynamic = 'force-dynamic';


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
    const [isCreating, setIsCreating] = useState(false);
    const [creationStep, setCreationStep] = useState('');
    const [creationProgress, setCreationProgress] = useState(0);
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
            title: 'Upload Documents',
            description: 'Policies, rules, templates, standards, etc',
            status: 'current' as const,
            icon: BookOpen01
        }
    ] as const;



    const updateFormData = (updates: Partial<FormBuilderState>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleCreateBase = async () => {
        try {
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
                        resolve(base64);
                    };
                    reader.onerror = reject;
                });
            };

            setCreationStep('Converting documents...');
            setCreationProgress(25);

            // Prepare base data
            const baseData: any = {
                name: formData.baseName || 'Untitled Knowledgebase',
                description: formData.description || 'Company-wide procurement standards and documents',
                moduleType: 'PROCUREMENT_ADMIN'
            };

            // Add all files as policy files (since we now have just one upload step)
            if (formData.policies?.length > 0) {
                const totalFiles = formData.policies.length;
                baseData.policyFiles = await Promise.all(
                    formData.policies.map(async (file: File, index: number) => {
                        const content = await fileToBase64(file);
                        const progress = 25 + Math.floor((index + 1) / totalFiles * 40);
                        setCreationStep(`Processing document ${index + 1} of ${totalFiles}...`);
                        setCreationProgress(progress);
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

            // Call async base creation API
            const response = await fetch('/api/procurement-base/create-async', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(baseData),
            });

            if (!response.ok) {
                throw new Error('Failed to create knowledgebase');
            }

            setCreationStep('Finalizing knowledgebase...');
            setCreationProgress(90);

            const result = await response.json();

            setCreationStep('Complete!');
            setCreationProgress(100);

            // Small delay to show completion state
            await new Promise(resolve => setTimeout(resolve, 500));

            // Redirect to base completion page
            router.push(`/procurement-admin/base-created?baseId=${result.base.id}`);

        } catch (error) {
            console.error('Error creating knowledgebase:', error);
            setIsCreating(false);
            alert('Failed to create knowledgebase. Please try again.');
        }
    };

    const renderCurrentStepContent = () => {
        return (
            <Step1UploadPolicies
                formData={formData}
                updateFormData={updateFormData}
                onNext={handleCreateBase}
            />
        );
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
                                    {creationProgress === 100 ? 'Knowledgebase Created!' : 'Creating Knowledgebase'}
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
                                    Please wait while we process your documents and set up the knowledge base...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                            <p className="text-display-md font-semibold text-primary">Setup Knowledgebase</p>
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
                            <span className="font-semibold">Setting up company standards?</span> Upload your organisation's procurement documents. These will form the foundation for all procurement activities.
                        </p>
                    </div>

                    {/* Info cards */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Building02} color="gray" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Organisation-Wide</p>
                                <p className="text-xs text-tertiary mt-1">These documents will apply to all procurement processes across your organisation</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Shield01} color="success" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Standards & Compliance</p>
                                <p className="text-xs text-tertiary mt-1">Ensure all procurement activities meet organisational standards</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={FileCheck02} color="brand" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Global Knowledge</p>
                                <p className="text-xs text-tertiary mt-1">Documents will be used as reference across all procurement assessments</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default SetupProcurementBasePage;