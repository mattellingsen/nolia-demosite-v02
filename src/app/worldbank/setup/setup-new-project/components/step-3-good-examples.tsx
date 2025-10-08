"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, Target01, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Trash01, Plus, File02 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";

interface Step3Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}

export const Step3GoodExamples: React.FC<Step3Props> = ({
    formData,
    updateFormData,
    onNext,
    onPrevious
}) => {
    const [uploadError, setUploadError] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);

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

        // Validate file sizes (10MB limit each)
        const oversizedFiles = fileArray.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            setUploadError('Some files exceed 10MB limit. Please reduce file sizes.');
            return;
        }

        setIsUploading(true);
        try {
            const existingFiles = formData.goodExamples || [];
            const updatedFiles = [...existingFiles, ...fileArray];
            updateFormData({
                goodExamples: updatedFiles,
                goodExamplesAnalysis: {
                    status: 'uploaded'
                }
            });
        } catch (error) {
            console.error('Error uploading documents:', error);
            setUploadError('Failed to upload documents. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [formData.goodExamples, updateFormData]);

    const removeFile = (index: number) => {
        const updatedFiles = formData.goodExamples.filter((_: any, i: number) => i !== index);
        updateFormData({ goodExamples: updatedFiles });
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
                        Upload Supporting Documents
                    </h2>
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        Upload supporting RFx documentation such as scoring rubrics, evaluation frameworks,
                        clarification documents (Q&A), response forms, and budget guidelines.
                    </p>
                </div>
            </div>

            {/* Current Files */}
            {hasFiles && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <h3 className="text-md font-semibold text-primary">Uploaded Supporting Documents</h3>
                    <div className="space-y-3">
                        {formData.goodExamples.map((file: File, index: number) => (
                            <div key={index} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon size="sm" color="gray" theme="light" icon={File02} />
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

            {/* Upload Success */}
            {formData.goodExamplesAnalysis && hasFiles && (
                <div className="bg-success-50 rounded-lg p-4 border border-success-200">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="light" icon={CheckCircle} />
                        <div>
                            <h3 className="text-lg font-semibold text-success-800">Supporting Documents Uploaded</h3>
                            <p className="text-sm text-success-600">
                                {formData.goodExamples.length} document{formData.goodExamples.length !== 1 ? 's' : ''} uploaded successfully.
                                These will be processed when your project is created.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Area */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    {/* Pro Tip */}
                    <div className="bg-warning-50 rounded-lg p-4 border border-warning-200 mb-5">
                        <p className="text-sm text-warning-800">
                            <strong>Pro tip:</strong> Upload supporting documents that provide additional context
                            for project evaluation. These help ensure consistent and comprehensive assessment of proposals.
                        </p>
                    </div>
                    <FileUpload.Root>
                        <FileUpload.DropZone
                            hint="PDF, Word documents, or Text files (max. 10MB each)"
                            accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                            allowsMultiple={true}
                            maxSize={10 * 1024 * 1024} // 10MB
                            onDropFiles={handleFileUpload}
                            onDropUnacceptedFiles={(files) => {
                                setUploadError('Please upload PDF, Word, or text files only.');
                            }}
                            onSizeLimitExceed={(files) => {
                                setUploadError('File size must be less than 10MB.');
                            }}
                            className="!bg-white !border !border-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center !rounded-lg upload-dropzone-custom"
                        />

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
                            <p className="text-sm font-medium text-primary">RFP Response Form</p>
                            <p className="text-xs text-secondary">Submission template</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <FeaturedIcon size="sm" color="gray" theme="light" icon={File02} />
                        <div>
                            <p className="text-sm font-medium text-primary">Evaluation Scorecard</p>
                            <p className="text-xs text-secondary">Criteria framework</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <FeaturedIcon size="sm" color="gray" theme="light" icon={File02} />
                        <div>
                            <p className="text-sm font-medium text-primary">Questions & Answers</p>
                            <p className="text-xs text-secondary">Clarifications</p>
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
                        Back to RFP Document
                    </Button>
                    <div className="text-sm text-secondary">
                        Step 3 of 4
                    </div>
                </div>

                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                >
                    Continue to Output Templates
                </Button>
            </div>

        </div>
    );
};