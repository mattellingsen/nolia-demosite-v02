"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, File02, ArrowRight, CheckCircle, AlertCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { analyzeDocumentViaAPI } from "@/lib/api-client";
import { type DocumentAnalysis } from "@/utils/browser-document-analyzer";

interface Step1Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
}

// Use DocumentAnalysis from the document analyzer utility
type FormAnalysis = DocumentAnalysis;

export const Step1UploadForm: React.FC<Step1Props> = ({ 
    formData, 
    updateFormData, 
    onNext 
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
    const [uploadError, setUploadError] = useState<string>('');
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);

    const analyzeForm = async (file: File) => {
        setIsAnalyzing(true);
        setUploadError('');
        
        try {
            // Use real document analysis via API (server-side PDF/Word processing)
            const documentAnalysis = await analyzeDocumentViaAPI(file);
            
            // Store both the analysis and the original file data for later use
            setAnalysis(documentAnalysis);
            
            // Update form data with the analysis results for persistence
            updateFormData({ 
                applicationForm: file,
                applicationFormAnalysis: documentAnalysis
            });
            
        } catch (error) {
            console.error('Analysis error:', error);
            setUploadError(error instanceof Error ? error.message : 'Failed to analyze the form. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileUpload = useCallback(async (files: FileList) => {
        const file = files[0];
        if (!file) return;

        setUploadError('');
        setIsUploading(true);
        setUploadProgress(0);

        // First update form data to show the file
        updateFormData({ applicationForm: file });
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    setIsUploading(false);
                    // Start analysis after a brief delay to show completed upload
                    setTimeout(() => {
                        analyzeForm(file);
                    }, 500);
                    return 100;
                }
                return prev + 10;
            });
        }, 200);
    }, [updateFormData]);

    const getFileType = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return 'pdf';
            case 'doc':
            case 'docx':
                return 'doc';
            default:
                return 'empty';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div>
                    <h2 className="text-display-sm font-semibold text-primary mb-2">
                        Upload Your Application Form
                    </h2>
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        Upload your current application form so our AI can analyze the questions, format, 
                        and structure to create an intelligent application bot.
                    </p>
                </div>
            </div>

            {/* Upload Area */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <FileUpload.Root>
                        <FileUpload.DropZone
                            hint="PDF, Word documents, or text files up to 10MB"
                            accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                            allowsMultiple={false}
                            maxSize={10 * 1024 * 1024} // 10MB
                            onDropFiles={handleFileUpload}
                            onDropUnacceptedFiles={(files) => {
                                setUploadError('Please upload a PDF, Word document, or text file.');
                            }}
                            onSizeLimitExceed={(files) => {
                                setUploadError('File size must be less than 10MB.');
                            }}
                            className="!bg-brand-secondary-25 !ring-1 !ring-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center"
                        />
                        
                        {formData.applicationForm && (
                            <FileUpload.List>
                                {formData.applicationForm && (
                                    <FileUpload.ListItemProgressBar
                                        name={formData.applicationForm.name}
                                        size={formData.applicationForm.size}
                                        progress={isUploading ? uploadProgress : 100}
                                        failed={false}
                                        type={getFileType(formData.applicationForm.name) as any}
                                        onDelete={() => {
                                            updateFormData({ applicationForm: null });
                                            setAnalysis(null);
                                            setUploadProgress(0);
                                            setIsUploading(false);
                                        }}
                                        onRetry={() => {}}
                                    />
                                )}
                            </FileUpload.List>
                        )}

                        {isAnalyzing && (
                            <div className="flex justify-center py-6">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                                    <p className="text-sm text-secondary">Analyzing your form...</p>
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
            {analysis && formData.applicationForm && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="light" icon={File02} />
                        <h3 className="text-lg font-semibold text-primary">Form Analysis Complete</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-brand-600 mb-1">{analysis.questionsFound}</p>
                            <p className="text-sm text-secondary">Questions Found</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-brand-600 mb-1">{analysis.fieldTypes.length}</p>
                            <p className="text-sm text-secondary">Field Types</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-brand-600 mb-1">{analysis.sections.length}</p>
                            <p className="text-sm text-secondary">Sections</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-2xl font-bold text-brand-600 mb-1">{analysis.wordCount?.toLocaleString() || 'N/A'}</p>
                            <p className="text-sm text-secondary">Word Count</p>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className={`text-2xl font-bold mb-1 ${
                                analysis.complexity === 'Simple' ? 'text-success-600' :
                                analysis.complexity === 'Medium' ? 'text-warning-600' : 'text-error-600'
                            }`}>
                                {analysis.complexity}
                            </p>
                            <p className="text-sm text-secondary">Complexity</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-sm font-medium text-primary mb-3">Detected Sections:</p>
                            <div className="space-y-2">
                                {analysis.extractedSections && analysis.extractedSections.length > 0 ? 
                                    analysis.extractedSections.map((section, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                            <div>
                                                <p className="text-sm font-medium text-primary">{section.title}</p>
                                                <p className="text-xs text-secondary">{section.questionCount} questions found</p>
                                            </div>
                                            <span className="px-2 py-1 bg-success-50 text-success-700 text-xs font-medium rounded">
                                                Section {index + 1}
                                            </span>
                                        </div>
                                    )) : 
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.sections.map((section, index) => (
                                            <span key={index} className="px-3 py-1 bg-success-50 text-success-700 text-xs font-medium rounded-full">
                                                {section}
                                            </span>
                                        ))}
                                    </div>
                                }
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-sm font-medium text-primary mb-3">Field Types Found:</p>
                            <div className="flex flex-wrap gap-2">
                                {analysis.fieldTypes.map((type, index) => (
                                    <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                        {type}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <div className="text-sm text-secondary">
                    Step 1 of 5
                </div>
                
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    isDisabled={!formData.applicationForm || isAnalyzing || !analysis}
                >
                    Continue to Selection Criteria
                </Button>
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-800">
                    <strong>Don't have a form yet?</strong> No problem! You can start from scratch by describing your 
                    requirements in the next steps, and our AI will help you build one.
                </p>
            </div>
        </div>
    );
};