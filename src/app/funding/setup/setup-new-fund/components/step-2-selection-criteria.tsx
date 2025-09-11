"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, FileCheck02, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Trash01, Plus, File02 } from "@untitledui/icons";
import { analyzeCriteriaViaAPI } from "@/lib/api-client";
import { type CriteriaAnalysis } from "@/utils/browser-document-analyzer";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

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
            // Use real criteria analysis via API (server-side PDF/Word processing)
            const realAnalysis = await analyzeCriteriaViaAPI(files);
            
            setAnalysis(realAnalysis);
            
            // Update form data with analysis results for persistence
            updateFormData({ 
                selectionCriteria: files,
                selectionCriteriaAnalysis: realAnalysis
            });
            
        } catch (error) {
            console.error('Criteria analysis error:', error);
            setUploadError(error instanceof Error ? error.message : 'Failed to analyze selection criteria. Please try again.');
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
                        Upload your assessment criteria documents. These will help Nolia validate applications 
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
                    
                    {/* Specific Assessment Criteria */}
                    {analysis.detectedCriteria && analysis.detectedCriteria.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-primary mb-3">Specific Assessment Criteria:</p>
                            <div className="space-y-2">
                                {analysis.detectedCriteria.map((criterion, index) => (
                                    <div key={index} className="flex items-start gap-2 p-3 bg-white rounded border border-gray-200">
                                        <span className="px-2 py-1 bg-warning-50 text-warning-700 text-xs font-medium rounded shrink-0">
                                            {index + 1}
                                        </span>
                                        <p className="text-sm text-primary">{criterion}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Area */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    {/* Pro Tip */}
                    <div className="bg-warning-50 rounded-lg p-4 border border-warning-200 mb-5">
                        <p className="text-sm text-warning-800">
                            <strong>Pro tip:</strong> Upload multiple documents like scoring rubrics, evaluation criteria, 
                            and assessment guidelines. The more context you provide, the better the AI will understand 
                            your requirements.
                        </p>
                    </div>
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
                            className="!bg-white !border !border-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center !rounded-lg upload-dropzone-custom"
                        />
                        
                        {isAnalyzing && (
                            <div className="flex justify-center py-6">
                                <LoadingIndicator 
                                    type="dot-circle" 
                                    size="md" 
                                    label="Analyzing criteria documents..." 
                                />
                            </div>
                        )}
                    </FileUpload.Root>
                    <style jsx global>{`
                        .upload-dropzone-custom {
                            box-shadow: 0 0 0 8px #F2FAFC !important;
                        }
                    `}</style>
                </div>
            </div>

            {/* Example Document Types */}
            <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-md font-semibold text-primary mb-4">Example Document Types</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <FeaturedIcon size="sm" color="gray" theme="light" icon={File02} />
                        <div>
                            <p className="text-sm font-medium text-primary">Ministerial Direction</p>
                            <p className="text-xs text-secondary">Government directives</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <FeaturedIcon size="sm" color="gray" theme="light" icon={File02} />
                        <div>
                            <p className="text-sm font-medium text-primary">Funding Agreements</p>
                            <p className="text-xs text-secondary">Terms and conditions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <FeaturedIcon size="sm" color="gray" theme="light" icon={File02} />
                        <div>
                            <p className="text-sm font-medium text-primary">Eligibility Requirements</p>
                            <p className="text-xs text-secondary">Qualification criteria</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {uploadError && (
                <div className="flex items-center gap-2 p-4 bg-error-50 border border-error-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-error-600" />
                    <p className="text-sm text-error-700">{uploadError}</p>
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
                    Continue to Output Templates
                </Button>
            </div>

        </div>
    );
};