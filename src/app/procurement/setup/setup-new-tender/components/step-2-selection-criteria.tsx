"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, FileCheck02, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Trash01, Plus, File02 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";

interface Step2Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}


export const Step2SelectionCriteria: React.FC<Step2Props> = ({ 
    formData, 
    updateFormData, 
    onNext,
    onPrevious
}) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const [uploadError, setUploadError] = useState<string>('');

    // Simplified: Just store files without analysis
    const handleCriteriaUpload = (files: File[]) => {
        updateFormData({ 
            selectionCriteria: files
        });
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
        handleCriteriaUpload(updatedFiles);
    }, [formData.selectionCriteria, updateFormData]);

    const removeFile = (index: number) => {
        const updatedFiles = formData.selectionCriteria.filter((_: any, i: number) => i !== index);
        handleCriteriaUpload(updatedFiles);
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
                        Upload RFP Document
                    </h2>
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        Upload the official Request for Proposal (RFP) document. This is the main tender document
                        that defines requirements and evaluation criteria.
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

            {/* Documents uploaded message */}
            {hasFiles && (
                <div className="bg-success-50 rounded-lg p-4 border border-success-200">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="light" icon={CheckCircle} />
                        <div>
                            <h3 className="text-lg font-semibold text-success-800">RFP Document Uploaded</h3>
                            <p className="text-sm text-success-600">
                                {formData.selectionCriteria.length} document{formData.selectionCriteria.length !== 1 ? 's' : ''} uploaded successfully.
                                These will be processed when your tender is created.
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
                            <strong>Pro tip:</strong> Upload the complete RFP document. You can also upload multiple versions
                            or addendums if they exist. The more context you provide, the better the AI will understand
                            the tender requirements.
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
                        Previous
                    </Button>
                    <div className="text-sm text-secondary">
                        Step 2 of 4
                    </div>
                </div>
                
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    isDisabled={!hasFiles}
                >
                    Continue to Supporting Documents
                </Button>
            </div>

        </div>
    );
};