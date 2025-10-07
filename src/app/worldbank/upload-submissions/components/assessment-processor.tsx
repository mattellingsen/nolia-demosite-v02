"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Clock, File02, TrendUp02, User, AlertCircle } from "@untitledui/icons";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { cx } from "@/utils/cx";
import {
    UIAssessmentResult,
    TemplateAssessmentResponse,
    convertToUIResult
} from "../types/assessment";

// Function to assess a file against project criteria using real AI assessment
async function assessFileAgainstTender(file: File, project: any): Promise<UIAssessmentResult> {
    if (!project?.id) {
        throw new Error('Project ID is required for assessment');
    }

    try {
        // Create FormData with the file
        const formData = new FormData();
        formData.append('submission', file);

        // Call the real assessment API
        const response = await fetch(`/api/assess/${project.id}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Assessment failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.assessment) {
            throw new Error('Invalid assessment response');
        }

        const assessment: TemplateAssessmentResponse = data.assessment;

        // Use the new converter function that handles templates
        return convertToUIResult(file, assessment, project);

    } catch (error) {
        console.error('Assessment error:', error);

        // Return error result
        return {
            fileName: file.name,
            rating: 0,
            categories: [project?.name || 'Unknown Project'],
            summary: `Assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isTemplateFormatted: false,
            details: {
                eligibility: { score: 0, notes: 'Assessment could not be completed' },
                impact: { score: 0, notes: 'Assessment could not be completed' },
                feasibility: { score: 0, notes: 'Assessment could not be completed' },
                innovation: { score: 0, notes: 'Assessment could not be completed' }
            },
            recommendations: ['Please try uploading the document again', 'Contact support if the issue persists'],
            status: 'error'
        };
    }
}

interface AssessmentProcessorProps {
    files: File[];
    selectedTender: any; // Project from useTenders hook
    onAssessmentComplete: (results: UIAssessmentResult[]) => void;
}

// Export the UIAssessmentResult type for components that need it
export type { UIAssessmentResult } from "../types/assessment";

export const AssessmentProcessor = ({ files, selectedTender, onAssessmentComplete }: AssessmentProcessorProps) => {
    const [currentProgress, setCurrentProgress] = useState(0);
    const [currentFile, setCurrentFile] = useState(0);
    const [assessmentPhase, setAssessmentPhase] = useState<'analyzing' | 'scoring' | 'finalizing' | 'complete'>('analyzing');
    const [results, setResults] = useState<UIAssessmentResult[]>([]);

    const phases = [
        { key: 'analyzing', label: 'Analyzing Documents', icon: File02, description: 'Extracting and validating content' },
        { key: 'scoring', label: 'Scoring Criteria', icon: TrendUp02, description: 'Evaluating against assessment criteria' },
        { key: 'finalizing', label: 'Finalizing Assessment', icon: CheckCircle, description: 'Generating final scores and recommendations' },
    ];

    const currentPhase = phases.find(p => p.key === assessmentPhase);

    useEffect(() => {
        // Real assessment process using the actual API
        const processAssessment = async () => {
            const totalPhases = phases.length;
            const totalFiles = files.length;
            const assessmentResults: UIAssessmentResult[] = [];

            for (let fileIndex = 0; fileIndex < totalFiles; fileIndex++) {
                setCurrentFile(fileIndex);
                const file = files[fileIndex];

                // Process each phase for this file
                for (let phaseIndex = 0; phaseIndex < totalPhases; phaseIndex++) {
                    setAssessmentPhase(phases[phaseIndex].key as any);

                    // Simulate phase progress
                    const phaseSteps = 20;
                    for (let step = 0; step <= phaseSteps; step++) {
                        const fileProgress = (fileIndex / totalFiles) * 100;
                        const phaseProgress = (phaseIndex / totalPhases) * (100 / totalFiles);
                        const stepProgress = (step / phaseSteps) * (100 / totalFiles / totalPhases);
                        const totalProgress = fileProgress + phaseProgress + stepProgress;

                        setCurrentProgress(Math.min(totalProgress, 100));
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }

                // Generate assessment result using real API
                const assessmentResult: UIAssessmentResult = await assessFileAgainstTender(file, selectedTender);

                assessmentResults.push(assessmentResult);
                setResults(prev => [...prev, assessmentResult]);
            }

            setAssessmentPhase('complete');
            setCurrentProgress(100);

            // Wait a moment then call completion callback with all collected results
            setTimeout(() => {
                onAssessmentComplete(assessmentResults);
            }, 1000);
        };

        processAssessment();
    }, [files, selectedTender, onAssessmentComplete]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-secondary-primary">
                    {currentPhase?.icon && <currentPhase.icon className="h-6 w-6 text-brand-secondary-solid" />}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {assessmentPhase === 'complete' ? 'Assessment Complete' : 'Processing Assessment'}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                    {assessmentPhase === 'complete' 
                        ? `Successfully assessed ${files.length} submission${files.length > 1 ? 's' : ''}`
                        : currentPhase?.description
                    }
                </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>
                        {assessmentPhase === 'complete' 
                            ? 'Complete' 
                            : `Processing ${currentFile + 1} of ${files.length}`
                        }
                    </span>
                    <span>{Math.round(currentProgress)}%</span>
                </div>
                <ProgressBar 
                    value={currentProgress} 
                    max={100}
                    className="h-2"
                />
            </div>

            {/* Current Phase */}
            {assessmentPhase !== 'complete' && (
                <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-brand-secondary-secondary flex items-center justify-center">
                                {currentPhase?.icon && <currentPhase.icon className="w-4 h-4 text-brand-secondary-solid" />}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{currentPhase?.label}</p>
                            <p className="text-sm text-gray-500">{currentPhase?.description}</p>
                        </div>
                        <div className="ml-auto">
                            <div className="animate-spin w-5 h-5 border-2 border-brand-secondary-200 border-t-brand-secondary-solid rounded-full" />
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Status */}
            {assessmentPhase === 'complete' && (
                <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <CheckCircle className="w-8 h-8 text-success-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">Assessment Complete</p>
                            <p className="text-sm text-gray-500">All submissions have been processed and scored</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};