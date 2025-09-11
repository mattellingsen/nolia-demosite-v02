"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Clock, File02, TrendUp02, User, AlertCircle } from "@untitledui/icons";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { cx } from "@/utils/cx";

// Function to assess a file against fund criteria
async function assessFileAgainstFund(file: File, fund: any): Promise<AssessmentResult> {
    // In a real implementation, this would:
    // 1. Extract text from the uploaded document
    // 2. Use AI/RAG to compare against fund's selectionCriteriaAnalysis
    // 3. Reference fund's goodExamplesAnalysis for benchmarking
    // 4. Generate scores based on fund's specific criteria
    
    // For now, we'll generate results that reference the actual fund
    const fundName = fund?.name || "Selected Fund";
    const baseScore = Math.floor(Math.random() * 40) + 60; // 60-100 range
    
    return {
        fileName: file.name,
        rating: baseScore,
        categories: [fundName, "Innovation", "Feasibility"],
        summary: `Application assessed against "${fundName}" criteria. ${
            baseScore >= 80 
                ? 'Strong alignment with fund objectives and demonstrates excellent potential for success.' 
                : baseScore >= 70 
                    ? 'Good alignment with fund criteria with some areas for improvement identified.'
                    : 'Moderate alignment with fund requirements. Several areas need strengthening.'
        }`,
        details: {
            eligibility: {
                score: Math.floor(Math.random() * 20) + 80,
                notes: `Meets eligibility requirements for "${fundName}". Application demonstrates understanding of fund objectives.`
            },
            impact: {
                score: Math.floor(Math.random() * 25) + 70,
                notes: `Impact potential assessed against "${fundName}" success criteria. ${
                    fund?.description ? 'Alignment with fund focus area identified.' : 'Good potential for meaningful impact.'
                }`
            },
            feasibility: {
                score: Math.floor(Math.random() * 20) + 75,
                notes: `Technical and commercial feasibility evaluated using "${fundName}" assessment framework.`
            },
            innovation: {
                score: Math.floor(Math.random() * 25) + 65,
                notes: `Innovation level assessed against "${fundName}" portfolio standards and good examples.`
            }
        },
        recommendations: [
            `Consider strengthening alignment with "${fundName}" specific priorities`,
            `Review "${fundName}" successful applications for benchmarking`,
            `Enhance sections that address "${fundName}" key evaluation criteria`
        ],
        status: 'completed'
    };
}

interface AssessmentProcessorProps {
    files: File[];
    selectedFund: any; // Fund from useFunds hook
    onAssessmentComplete: (results: AssessmentResult[]) => void;
}

export interface AssessmentResult {
    fileName: string;
    rating: number;
    categories: string[];
    summary: string;
    details: {
        eligibility: {
            score: number;
            notes: string;
        };
        impact: {
            score: number;
            notes: string;
        };
        feasibility: {
            score: number;
            notes: string;
        };
        innovation: {
            score: number;
            notes: string;
        };
    };
    recommendations: string[];
    status: 'processing' | 'completed' | 'error';
}

export const AssessmentProcessor = ({ files, selectedFund, onAssessmentComplete }: AssessmentProcessorProps) => {
    const [currentProgress, setCurrentProgress] = useState(0);
    const [currentFile, setCurrentFile] = useState(0);
    const [assessmentPhase, setAssessmentPhase] = useState<'analyzing' | 'scoring' | 'finalizing' | 'complete'>('analyzing');
    const [results, setResults] = useState<AssessmentResult[]>([]);

    const phases = [
        { key: 'analyzing', label: 'Analyzing Documents', icon: File02, description: 'Extracting and validating content' },
        { key: 'scoring', label: 'Scoring Criteria', icon: TrendUp02, description: 'Evaluating against assessment criteria' },
        { key: 'finalizing', label: 'Finalizing Assessment', icon: CheckCircle, description: 'Generating final scores and recommendations' },
    ];

    const currentPhase = phases.find(p => p.key === assessmentPhase);

    useEffect(() => {
        // Simulate RAG assessment process
        const processAssessment = async () => {
            const totalPhases = phases.length;
            const totalFiles = files.length;
            
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
                
                // Generate assessment result based on selected fund criteria
                const assessmentResult: AssessmentResult = await assessFileAgainstFund(file, selectedFund);
                
                setResults(prev => [...prev, assessmentResult]);
            }
            
            setAssessmentPhase('complete');
            setCurrentProgress(100);
            
            // Wait a moment then call completion callback with all results
            setTimeout(() => {
                onAssessmentComplete(results);
            }, 1000);
        };

        processAssessment();
    }, [files]);

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
                        ? `Successfully assessed ${files.length} application${files.length > 1 ? 's' : ''}`
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
                            <p className="text-sm text-gray-500">All applications have been processed and scored</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};