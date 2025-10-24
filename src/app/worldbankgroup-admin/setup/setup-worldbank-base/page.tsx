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

const SetupWorldBankGroupBasePage = () => {
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
            title: '',
            description: '',
            status: 'current' as const,
            icon: BookOpen01
        }
    ] as const;



    const updateFormData = (updates: Partial<FormBuilderState>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleCreateBase = async () => {
        try {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎭 [WorldBankGroup FAKE DEMO] handleCreateBase() called');
            console.log('🎭 [WorldBankGroup] formData.baseName:', formData.baseName);
            console.log('🎭 [WorldBankGroup] formData.policies:', formData.policies);
            console.log('🎭 [WorldBankGroup] Number of files:', formData.policies?.length || 0);
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
                        const base64 = result.split(',')[1];
                        console.log(`📄 [WorldBankGroup] Converted ${file.name} to base64, length: ${base64?.length || 0}`);
                        resolve(base64);
                    };
                    reader.onerror = (error) => {
                        console.error(`❌ [WorldBankGroup] Failed to read ${file.name}:`, error);
                        reject(error);
                    };
                });
            };

            setCreationStep('Converting documents...');
            setCreationProgress(25);

            // Prepare base data
            const baseData: any = {
                name: formData.baseName || 'Untitled Knowledge Base',
                description: formData.description || 'Company-wide WorldBankGroup standards and documents',
                moduleType: 'WORLDBANKGROUP_ADMIN'
            };

            console.log('📦 [WorldBankGroup] Base data prepared:', {
                name: baseData.name,
                description: baseData.description,
                moduleType: baseData.moduleType
            });

            // Add all files as policy files
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

            console.log('📤 [WorldBankGroup] About to send API request to /api/worldbankgroup-base/create-async');

            // Call async base creation API (FAKE DEMO)
            const response = await fetch('/api/worldbankgroup-base/create-async', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(baseData),
            });

            console.log('📥 [WorldBankGroup] API response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ [WorldBankGroup] API error response:', errorData);
                throw new Error(`Failed to create knowledge base: ${errorData.error || response.statusText}`);
            }

            setCreationStep('Finalizing knowledge base...');
            setCreationProgress(90);

            const result = await response.json();
            console.log('✅ [WorldBankGroup FAKE DEMO] API success response:', result);

            setCreationStep('Complete!');
            setCreationProgress(100);

            // Small delay to show completion state
            await new Promise(resolve => setTimeout(resolve, 500));

            // Redirect to base completion page
            router.push(`/worldbankgroup-admin/base-created?baseId=${result.base.id}`);

        } catch (error) {
            console.error('[WorldBankGroup] Error creating knowledge base:', error);
            setIsCreating(false);
            alert('Failed to create knowledge base. Please try again.');
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
                                    {creationProgress === 100 ? 'Knowledge Base Created!' : 'Creating Knowledge Base'}
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
                    activeUrl="/worldbankgroup-admin/setup"
                    items={[
                        {
                            label: "Setup",
                            href: "/worldbankgroup-admin/setup",
                            icon: Edit05,
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
                            href="/worldbankgroup-admin/setup"
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back
                        </Button>
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-md font-semibold text-tertiary">WorldBankGroup Admin</p>
                            <p className="text-display-md font-semibold text-primary">Setup Knowledge Base</p>
                        </div>
                    </div>
                </div>


                {/* Progress Steps */}
                <div className="px-4 lg:px-8">
                    <div className="flex justify-center mb-1.5">
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
                    {/* Info cards */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Building02} color="gray" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Organisation-Wide</p>
                                <p className="text-xs text-tertiary mt-1">These documents will apply to all WorldBankGroup processes</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Shield01} color="success" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Standards & Compliance</p>
                                <p className="text-xs text-tertiary mt-1">Ensure all activities meet organisational standards</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={FileCheck02} color="brand" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Global Knowledge</p>
                                <p className="text-xs text-tertiary mt-1">Documents will be used as reference across all assessments</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default SetupWorldBankGroupBasePage;
