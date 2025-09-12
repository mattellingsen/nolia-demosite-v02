"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, Target01, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Trash01, Plus, Award01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { analyzeGoodExamplesViaAPI } from "@/lib/api-client";

interface Step4Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}

interface ExampleAnalysis {
    examplesAnalyzed: number;
    averageScore: number;
    qualityIndicators: {
        name: string;
        score: number;
        description: string;
    }[];
    writingPatterns: string[];
    commonStrengths: string[];
}

export const Step4GoodExamples: React.FC<Step4Props> = ({ 
    formData, 
    updateFormData, 
    onNext,
    onPrevious
}) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<ExampleAnalysis | null>(null);
    const [uploadError, setUploadError] = useState<string>('');

    const analyzeExamples = async (files: File[]) => {
        setIsAnalyzing(true);
        setUploadError('');
        
        try {
            // Use real API to analyze good examples
            const analysisResult = await analyzeGoodExamplesViaAPI(files);
            
            // Map the API response to our component's expected format
            const mappedAnalysis: ExampleAnalysis = {
                examplesAnalyzed: analysisResult.examplesAnalyzed || files.length,
                averageScore: analysisResult.averageScore || 75,
                qualityIndicators: analysisResult.qualityIndicators || [],
                writingPatterns: analysisResult.writingPatterns || [],
                commonStrengths: analysisResult.commonStrengths || []
            };
            
            setAnalysis(mappedAnalysis);
            updateFormData({ goodExamplesAnalysis: mappedAnalysis });
        } catch (error) {
            console.error('Good examples analysis error:', error);
            setUploadError('Failed to analyze good examples. Please try again.');
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
            'text/plain'
        ];

        const invalidFiles = fileArray.filter(file => !allowedTypes.includes(file.type));
        if (invalidFiles.length > 0) {
            setUploadError('Some files are not supported. Please upload PDF, Word, or text files only.');
            return;
        }

        // Validate file sizes (15MB limit each for examples)
        const oversizedFiles = fileArray.filter(file => file.size > 15 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            setUploadError('Some files exceed 15MB limit. Please reduce file sizes.');
            return;
        }

        const existingFiles = formData.goodExamples || [];
        const updatedFiles = [...existingFiles, ...fileArray];
        updateFormData({ goodExamples: updatedFiles });
        await analyzeExamples(updatedFiles);
    }, [formData.goodExamples, updateFormData]);

    const removeFile = (index: number) => {
        const updatedFiles = formData.goodExamples.filter((_: any, i: number) => i !== index);
        updateFormData({ goodExamples: updatedFiles });
        
        if (updatedFiles.length === 0) {
            setAnalysis(null);
        } else {
            analyzeExamples(updatedFiles);
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

    const hasFiles = formData.goodExamples && formData.goodExamples.length > 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div>
                    <h2 className="text-display-sm font-semibold text-primary mb-2">
                        Upload Good Examples
                    </h2>
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        Upload examples of high-quality applications that meet your standards. The AI will 
                        learn from these to set quality expectations and guide applicants.
                    </p>
                </div>
            </div>

            {/* Current Files */}
            {hasFiles && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <h3 className="text-md font-semibold text-primary">Uploaded Example Applications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.goodExamples.map((file: File, index: number) => (
                            <div key={index} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon size="sm" color="success" theme="light" icon={Award01} />
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
                        <FeaturedIcon size="md" color="success" theme="light" icon={CheckCircle} />
                        <h3 className="text-lg font-semibold text-primary">Example Analysis Complete</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-success-600 mb-1">{analysis.examplesAnalyzed}</p>
                            <p className="text-sm text-secondary">Examples Analyzed</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-success-600 mb-1">{analysis.averageScore}%</p>
                            <p className="text-sm text-secondary">Average Quality Score</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-success-600 mb-1">{analysis.qualityIndicators.length}</p>
                            <p className="text-sm text-secondary">Quality Metrics</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Quality Indicators */}
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-primary">Quality Indicators:</p>
                            <div className="space-y-3">
                                {analysis.qualityIndicators.map((indicator, index) => (
                                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-primary">{indicator.name}</p>
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                                                indicator.score >= 90 ? 'bg-success-50 text-success-700' :
                                                indicator.score >= 80 ? 'bg-warning-50 text-warning-700' :
                                                'bg-error-50 text-error-700'
                                            }`}>
                                                {indicator.score}%
                                            </span>
                                        </div>
                                        <p className="text-xs text-secondary">{indicator.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Writing Patterns */}
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-primary">Writing Patterns Identified:</p>
                            <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-2">
                                {analysis.writingPatterns.map((pattern, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 bg-brand-600 rounded-full mt-2 shrink-0"></span>
                                        <p className="text-sm text-secondary">{pattern}</p>
                                    </div>
                                ))}
                            </div>

                            <p className="text-sm font-medium text-primary">Common Strengths:</p>
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex flex-wrap gap-2">
                                    {analysis.commonStrengths.map((strength, index) => (
                                        <span key={index} className="px-3 py-1 bg-success-50 text-success-700 text-xs font-medium rounded-full">
                                            {strength}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                            <strong>AI Learning Complete:</strong> The system has analyzed your examples and will now 
                            use these quality standards to guide applicants and validate submissions automatically.
                        </p>
                    </div>
                </div>
            )}

            {/* Upload Area */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    {/* Quality Tip */}
                    <div className="bg-warning-50 rounded-lg p-4 border border-warning-200 mb-5">
                        <p className="text-sm text-warning-800">
                            <strong>Quality matters:</strong> Upload your best applications - those that scored highly 
                            and met all criteria. Nolia will learn from these to help future applicants create 
                            better submissions and reduce your assessment workload.
                        </p>
                    </div>
                    <FileUpload.Root>
                        <FileUpload.DropZone
                            hint="PDF, Word documents, or Text files (max. 15MB each)"
                            accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                            allowsMultiple={true}
                            maxSize={15 * 1024 * 1024} // 15MB
                            onDropFiles={handleFileUpload}
                            onDropUnacceptedFiles={(files) => {
                                setUploadError('Please upload PDF, Word, or text files only.');
                            }}
                            onSizeLimitExceed={(files) => {
                                setUploadError('File size must be less than 15MB.');
                            }}
                            className="!bg-white !border !border-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center !rounded-lg upload-dropzone-custom"
                        />
                        
                        {isAnalyzing && (
                            <div className="flex justify-center py-6">
                                <LoadingIndicator 
                                    type="dot-circle" 
                                    size="md" 
                                    label="Analyzing example applications..." 
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
                        Back to Output Templates
                    </Button>
                    <div className="text-sm text-secondary">
                        Step 4 of 5
                    </div>
                </div>
                
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    isDisabled={!hasFiles || isAnalyzing || !analysis}
                >
                    Continue to Test Assessment
                </Button>
            </div>

        </div>
    );
};