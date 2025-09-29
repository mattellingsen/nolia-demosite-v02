"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, FileCheck02, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Trash01, Plus } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";

interface Step2Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}

interface CriteriaAnalysis {
    criteriaFound: number;
    weightings: { name: string; weight: number }[];
    categories: string[];
    scoringMethod: 'Points' | 'Percentage' | 'Pass/Fail';
}

export const Step2SelectionCriteria: React.FC<Step2Props> = ({ 
    formData, 
    updateFormData, 
    onNext,
    onPrevious
}) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<CriteriaAnalysis | null>(null);
    const [uploadError, setUploadError] = useState<string>('');

    const analyzeCriteria = async (files: File[]) => {
        setIsAnalyzing(true);
        setUploadError('');
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Mock analysis results
            const mockAnalysis: CriteriaAnalysis = {
                criteriaFound: Math.floor(Math.random() * 8) + 4, // 4-12 criteria
                weightings: [
                    { name: 'Innovation', weight: 30 },
                    { name: 'Financial Viability', weight: 25 },
                    { name: 'Team Experience', weight: 20 },
                    { name: 'Market Potential', weight: 15 },
                    { name: 'Risk Assessment', weight: 10 }
                ],
                categories: ['Technical Merit', 'Commercial Viability', 'Team Capability', 'Implementation Plan'],
                scoringMethod: files.some(f => f.name.includes('points')) ? 'Points' : 
                              files.some(f => f.name.includes('percent')) ? 'Percentage' : 'Pass/Fail'
            };
            
            setAnalysis(mockAnalysis);
        } catch (error) {
            setUploadError('Failed to analyze selection criteria. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileUpload = useCallback(async (files: FileList) => {
        const fileArray = Array.from(files);
        
        // Validate file types
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];

        const invalidFiles = fileArray.filter(file => !allowedTypes.includes(file.type));
        if (invalidFiles.length > 0) {
            setUploadError('Some files are not supported. Please upload PDF, Word, Excel, or text files only.');
            return;
        }

        // Validate file sizes (10MB limit each)
        const oversizedFiles = fileArray.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            setUploadError('Some files exceed 10MB limit. Please reduce file sizes.');
            return;
        }

        const existingFiles = formData.selectionCriteria || [];
        const updatedFiles = [...existingFiles, ...fileArray];
        updateFormData({ selectionCriteria: updatedFiles });
        await analyzeCriteria(updatedFiles);
    }, [formData.selectionCriteria, updateFormData]);

    const removeFile = (index: number) => {
        const updatedFiles = formData.selectionCriteria.filter((_: any, i: number) => i !== index);
        updateFormData({ selectionCriteria: updatedFiles });
        
        if (updatedFiles.length === 0) {
            setAnalysis(null);
        } else {
            analyzeCriteria(updatedFiles);
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileUpload(files);
        }
    }, [handleFileUpload]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files);
        }
    };

    const hasFiles = formData.selectionCriteria && formData.selectionCriteria.length > 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div>
                    <h2 className="text-display-sm font-semibold text-primary mb-2">
                        Upload Selection Criteria
                    </h2>
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        Upload your assessment criteria documents. These will help the AI validate applications 
                        and ensure only qualified submissions are processed.
                    </p>
                </div>
            </div>

            {/* Current Files */}
            {hasFiles && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <h3 className="text-md font-semibold text-primary">Uploaded Criteria Documents</h3>
                    <div className="space-y-3">
                        {formData.selectionCriteria.map((file: File, index: number) => (
                            <div key={index} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon size="sm" color="gray" theme="light" icon={FileCheck02} />
                                    <div>
                                        <p className="text-sm font-medium text-primary">{file.name}</p>
                                        <p className="text-xs text-secondary">{Math.round(file.size / 1024)} KB</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    color="tertiary"
                                    iconLeading={Trash01}
                                    onClick={() => removeFile(index)}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Area */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <FileUpload.Root>
                        <FileUpload.DropZone
                            hint="PDF, Word, Excel documents, or Text files (max. 10MB each)"
                            accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            allowsMultiple={true}
                            maxSize={10 * 1024 * 1024} // 10MB
                            onDropFiles={handleFileUpload}
                            onDropUnacceptedFiles={(files) => {
                                setUploadError('Please upload PDF, Word, Excel, or text files only.');
                            }}
                            onSizeLimitExceed={(files) => {
                                setUploadError('File size must be less than 10MB.');
                            }}
                            className="!bg-brand-secondary-25 !ring-1 !ring-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center"
                        />
                        
                        {isAnalyzing && (
                            <div className="flex justify-center py-6">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                                    <p className="text-sm text-secondary">Analyzing criteria documents...</p>
                                </div>
                            </div>
                        )}
                    </FileUpload.Root>
                </div>
            </div>

            {/* Error Display */}
            {uploadError && (
                <div className="flex items-center gap-2 p-4 bg-error-50 border border-error-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-error-600" />
                    <p className="text-sm text-error-700">{uploadError}</p>
                </div>
            )}

            {/* Analysis Results */}
            {analysis && hasFiles && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="light" icon={CheckCircle} />
                        <h3 className="text-lg font-semibold text-primary">Criteria Analysis Complete</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-brand-600 mb-1">{analysis.criteriaFound}</p>
                            <p className="text-sm text-secondary">Assessment Criteria</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-brand-600 mb-1">{analysis.categories.length}</p>
                            <p className="text-sm text-secondary">Categories</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-brand-600 mb-1">{analysis.scoringMethod}</p>
                            <p className="text-sm text-secondary">Scoring Method</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm font-medium text-primary mb-3">Assessment Categories:</p>
                            <div className="space-y-2">
                                {analysis.categories.map((category, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                                        <span className="px-2 py-1 bg-brand-50 text-brand-700 text-xs font-medium rounded">
                                            {index + 1}
                                        </span>
                                        <p className="text-sm text-primary">{category}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-sm font-medium text-primary mb-3">Detected Weightings:</p>
                            <div className="space-y-2">
                                {analysis.weightings.map((weighting, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                        <p className="text-sm text-primary">{weighting.name}</p>
                                        <span className="px-2 py-1 bg-success-50 text-success-700 text-xs font-medium rounded">
                                            {weighting.weight}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <div className="flex items-center gap-4">
                    <Button
                        size="lg"
                        color="tertiary"
                        iconLeading={ArrowLeft}
                        onClick={onPrevious}
                    >
                        Previous
                    </Button>
                    <div className="text-sm text-secondary">
                        Step 2 of 5
                    </div>
                </div>
                
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    isDisabled={!hasFiles || isAnalyzing || !analysis}
                >
                    Continue to Good Examples
                </Button>
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                    <strong>Pro tip:</strong> Upload multiple documents like scoring rubrics, evaluation criteria, 
                    and assessment guidelines. The more context you provide, the better the AI will understand 
                    your requirements.
                </p>
            </div>
        </div>
    );
};