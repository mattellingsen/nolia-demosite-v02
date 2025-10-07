"use client";

// CACHE BUST: 2024-09-28-01:35 - Force rebuild to clear cached mock save handler
import { useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
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

type WorkflowStep = 'upload' | 'processing' | 'results';

const UploadSubmissionsPage = () => {
    const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
    const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
    const [selectedTender, setSelectedTender] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const queryClient = useQueryClient();
    const { data: projects, isLoading: tendersLoading, error: tendersError } = useTenders();

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
        console.log('🚀🚀🚀 DEBUG: handleSubmitToDatabase called - NEW VERSION WITH MIME TYPE DEBUG');
        console.log('🚀 handleSubmitToDatabase: Starting save process - FORCED REBUILD');
        console.log('📊 Selected Project:', selectedTender);
        console.log('📋 Assessment Results Count:', assessmentResults.length);
        console.log('📋 Assessment Results Data:', assessmentResults);

        // DETAILED ANALYSIS OF ASSESSMENT RESULTS
        console.log('🔍 DETAILED ASSESSMENT ANALYSIS:');
        assessmentResults.forEach((result, index) => {
            console.log(`  Assessment ${index + 1}:`, {
                fileName: result.fileName,
                status: result.status,
                rating: result.rating,
                ratingType: typeof result.rating,
                isRatingValid: typeof result.rating === 'number' && !isNaN(result.rating),
                hasRecommendations: !!result.recommendations,
                recommendationsLength: result.recommendations?.length || 0,
                fullStructure: result
            });
        });

        // Filter successful assessments to see what would be saved
        const savableAssessments = assessmentResults.filter(r => r.status === 'completed');
        console.log('💾 Savable assessments (status === completed):', savableAssessments.length);

        if (!selectedTender || assessmentResults.length === 0) {
            console.error('❌ Validation failed:', {
                selectedTender: !!selectedTender,
                selectedTenderId: selectedTender?.id,
                assessmentResultsLength: assessmentResults.length,
                savableAssessmentsLength: savableAssessments.length
            });
            alert('No project selected or no assessment results to save.');
            return;
        }

        if (savableAssessments.length === 0) {
            console.error('❌ No completed assessments to save! All assessments have status:',
                assessmentResults.map(r => r.status)
            );
            alert('No completed assessments to save. Please ensure assessments completed successfully.');
            return;
        }

        setIsSubmitting(true);
        try {
            console.log(`🔄 About to create ${assessmentResults.length} save promises`);

            // Save each assessment result to the database
            const savePromises = assessmentResults.map(async (result, index) => {
                console.log(`💾 PROCESSING assessment ${index + 1}/${assessmentResults.length}:`, {
                    fileName: result.fileName,
                    status: result.status,
                    rating: result.rating,
                    willSkipDueToStatus: result.status !== 'completed'
                });

                // Skip assessments that aren't completed
                if (result.status !== 'completed') {
                    console.log(`⏭️ SKIPPING assessment ${index + 1} - status is '${result.status}', not 'completed'`);
                    return { skipped: true, reason: `Status is ${result.status}` };
                }

                console.log(`✅ PROCEEDING to save assessment ${index + 1}: ${result.fileName}`);
                // Extract organization name from filename (remove extension)
                const organizationName = result.fileName.replace(/\.[^/.]+$/, "");

                // Determine assessment type based on the result
                const assessmentType = result.isTemplateFormatted ? 'AI_POWERED' : 'PATTERN_BASED';

                // Prepare data for API
                const assessmentData = {
                    projectId: selectedTender.id,
                    organizationName,
                    projectName: organizationName, // Use same as organization for now
                    assessmentType,
                    overallScore: result.rating,
                    scoringResults: {
                        rating: result.rating,
                        categories: result.categories,
                        summary: result.summary,
                        status: result.status,
                        recommendations: result.recommendations,
                        ...(result.isTemplateFormatted && {
                            templateSections: result.templateSections,
                            isTemplateFormatted: true
                        }),
                        ...(result.isFilledTemplate && {
                            filledTemplate: result.filledTemplate,
                            isFilledTemplate: true
                        }),
                        ...(result.details && { legacyDetails: result.details })
                    },
                    assessmentData: {
                        fileName: result.fileName,
                        fileMimeType: result.fileMimeType, // Pass the file MIME type
                        originalResult: result,
                        processedAt: new Date().toISOString(),
                        projectName: selectedTender.name
                    }
                };

                console.log('🔍 DEBUG: Assessment result before save:', {
                    fileName: result.fileName,
                    fileMimeType: result.fileMimeType,
                    status: result.status,
                    rating: result.rating
                });
                console.log('📤 Sending assessment data to API:', assessmentData);
                console.log('🌐 Making fetch request to /api/assessments...');

                let response;
                try {
                    response = await fetch('/api/assessments', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(assessmentData),
                    });
                    console.log('📥 Fetch completed. Response received.');
                } catch (fetchError) {
                    console.error('❌ Fetch request failed:', fetchError);
                    throw new Error(`Network error while saving assessment for ${result.fileName}: ${fetchError.message}`);
                }

                console.log('📥 API Response Status:', response.status);
                console.log('📥 API Response Headers:', Object.fromEntries(response.headers.entries()));

                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (jsonError) {
                        console.error('❌ Could not parse error response as JSON:', jsonError);
                        throw new Error(`Failed to save assessment for ${result.fileName}: HTTP ${response.status}`);
                    }
                    console.error('❌ Failed to save assessment:', errorData);
                    throw new Error(`Failed to save assessment for ${result.fileName}: ${errorData.error}`);
                }

                let savedData;
                try {
                    savedData = await response.json();
                } catch (jsonError) {
                    console.error('❌ Could not parse success response as JSON:', jsonError);
                    throw new Error(`Received response but could not parse JSON for ${result.fileName}`);
                }
                console.log('✅ Successfully saved assessment:', savedData);
                return savedData;
            });

            // Wait for all assessments to be saved
            console.log(`⏳ Waiting for ${savePromises.length} save promises to complete...`);

            const savedResults = await Promise.all(savePromises);

            console.log('📊 SAVE RESULTS ANALYSIS:');
            console.log('  - Total promises created:', savePromises.length);
            console.log('  - Total results returned:', savedResults.length);

            const actualSaves = savedResults.filter(r => !r.skipped);
            const skippedSaves = savedResults.filter(r => r.skipped);

            console.log('  - Actually processed:', actualSaves.length);
            console.log('  - Skipped:', skippedSaves.length);
            console.log('  - Skipped reasons:', skippedSaves.map(r => r.reason));

            console.log('🎉 Full save results:', savedResults);
            console.log('🎉 Actual API responses:', actualSaves);
            console.log('🎉 Saved assessment IDs:', actualSaves.map(r => r.assessment?.id));

            // Invalidate assessments cache to ensure fresh data is shown in the assess page
            console.log('🔄 Invalidating React Query cache for assessments');
            try {
                // Invalidate all assessments queries with exact key pattern matching
                await queryClient.invalidateQueries({
                    predicate: (query) => {
                        const queryKey = query.queryKey;
                        console.log('🔍 Checking query key for invalidation:', queryKey);
                        // Match any query that starts with 'assessments'
                        return Array.isArray(queryKey) && queryKey[0] === 'assessments';
                    }
                });
                console.log('✅ React Query cache invalidation completed');

                // Also refetch any active assessments queries to ensure immediate update
                await queryClient.refetchQueries({
                    predicate: (query) => {
                        const queryKey = query.queryKey;
                        // Match any query that starts with 'assessments'
                        return Array.isArray(queryKey) && queryKey[0] === 'assessments';
                    }
                });
                console.log('✅ React Query refetch completed');
            } catch (cacheError) {
                console.error('❌ React Query cache invalidation failed:', cacheError);
            }

            console.log('🎊 Showing success message to user');
            const successfulSaves = actualSaves.filter(r => r.assessment?.id).length;
            console.log('📈 Final count for user message:', {
                totalAssessments: assessmentResults.length,
                actualSaves: actualSaves.length,
                successfulSaves: successfulSaves,
                skippedSaves: skippedSaves.length
            });

            alert(`DEBUG: ${successfulSaves} of ${assessmentResults.length} assessment(s) saved successfully! (${skippedSaves.length} skipped). Check console for details.`);

            // Reset the workflow
            setCurrentStep('upload');
            setUploadedFiles([]);
            setAssessmentResults([]);

        } catch (error) {
            console.error('❌ CRITICAL ERROR in handleSubmitToDatabase:', error);
            console.error('❌ Error type:', typeof error);
            console.error('❌ Error constructor:', error?.constructor?.name);
            console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Showing error alert to user:', errorMessage);
            alert(`Failed to save assessments: ${errorMessage}`);
        } finally {
            console.log('🔄 Setting isSubmitting to false');
            setIsSubmitting(false);
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
                        isSubmitting={isSubmitting}
                    />
                );
        }
    };

    return (
        <div className="flex flex-col bg-primary lg:flex-row">
            <SidebarNavigationSlim
                activeUrl="/worldbank/assess"
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
                            href="/worldbank"
                            className="self-start [&_svg]:!text-brand-600"
                        >
                            Back
                        </Button>
                        <div className="flex flex-col gap-1 text-center">
                            <p className="text-md font-semibold text-tertiary">Upload & Assess</p>
                            <p className="text-display-md font-semibold text-primary">Submission Upload</p>
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
                                Select the project to assess against
                            </p>
                        </div>
                        <div className="relative select-custom">
                            {tendersError ? (
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
                                        href="/worldbank/setup"
                                        className="mt-2"
                                    >
                                        Go to Setup
                                    </Button>
                                </div>
                            ) : (
                                <Select
                                    placeholder={tendersLoading ? "Loading projects..." : "Select project"}
                                    size="md"
                                    items={projects ? projects.map(project => ({
                                        id: project.id,
                                        label: project.name,
                                        supportingText: project.status.toLowerCase()
                                    })) : []}
                                    placeholderIcon={Folder}
                                    className="w-full"
                                    isDisabled={tendersLoading || !projects || projects.length === 0}
                                    selectedKey={selectedTender?.id}
                                    onSelectionChange={(selectedId) => {
                                        if (selectedId) {
                                            const project = projects?.find(project => project.id === selectedId);
                                            setSelectedTender(project);
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

                {/* Upload Instructions - only show when project is selected */}
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
                        <p className="text-lg font-semibold text-primary">Our projects</p>
                        <Button size="md" color="link-gray" iconLeading={Plus}>
                            Add project
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
                                                    Procure innovative businesses to provide quality services.
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
                        <a href="/worldbank/upload-submissions" className="flex items-center gap-3 rounded-xl bg-utility-blue-50 p-4 hover:bg-utility-blue-100 cursor-pointer transition-colors">
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

export default UploadSubmissionsPage;