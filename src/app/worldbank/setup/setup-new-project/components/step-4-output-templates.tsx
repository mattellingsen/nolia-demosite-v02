"use client";

import { useState, useCallback } from "react";
import { ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";

interface Step4Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}

export const Step4OutputTemplates: React.FC<Step4Props> = ({
    formData,
    updateFormData,
    onNext,
    onPrevious
}) => {
    const [uploadError, setUploadError] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = useCallback(async (files: FileList) => {
        const fileArray = Array.from(files);
        setUploadError('');
        setIsUploading(true);

        try {
            // Store the output template files
            updateFormData({
                outputTemplates: fileArray,
                outputTemplatesAnalysis: {
                    status: 'uploaded'
                }
            });
        } catch (error) {
            console.error('Error uploading templates:', error);
            setUploadError('Failed to upload templates. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [updateFormData]);

    const handleRemoveFile = (fileName: string) => {
        const updatedFiles = formData.outputTemplates.filter((file: File) => file.name !== fileName);
        updateFormData({ outputTemplates: updatedFiles });

        if (updatedFiles.length === 0) {
            updateFormData({ outputTemplatesAnalysis: null });
        }
    };

    const getFileType = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return 'pdf';
            case 'doc':
            case 'docx':
                return 'doc';
            case 'txt':
                return 'empty';
            default:
                return 'empty';
        }
    };

    const canProceed = formData.outputTemplates && formData.outputTemplates.length > 0 && !isUploading;

    // Note: The actual project creation is handled by the parent component's onNext function


    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Instructions */}
            <div className="text-center mb-6">
                <p className="text-lg text-secondary max-w-2xl mx-auto">
                    Upload output templates that define how project evaluation results should be formatted and presented.
                </p>
            </div>

            {/* Upload Area */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <FileUpload.Root>
                        <FileUpload.DropZone
                            hint="PDF, Word documents, or text files up to 10MB each"
                            accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                            allowsMultiple={true}
                            maxSize={10 * 1024 * 1024} // 10MB
                            onDropFiles={handleFileUpload}
                            onDropUnacceptedFiles={(files) => {
                                setUploadError('Please upload PDF, Word document, or text files.');
                            }}
                            onSizeLimitExceed={(files) => {
                                setUploadError('File size must be less than 10MB.');
                            }}
                            className="!bg-white !border !border-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center !rounded-lg upload-dropzone-custom"
                        />

                        {formData.outputTemplates && formData.outputTemplates.length > 0 && (
                            <FileUpload.List>
                                {formData.outputTemplates.map((file: File, index: number) => (
                                    <FileUpload.ListItemProgressBar
                                        key={`${file.name}-${index}`}
                                        name={file.name}
                                        size={file.size}
                                        progress={100}
                                        failed={false}
                                        type={getFileType(file.name) as any}
                                        onDelete={() => handleRemoveFile(file.name)}
                                        onRetry={() => {}}
                                    />
                                ))}
                            </FileUpload.List>
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

            {/* Upload Success */}
            {formData.outputTemplatesAnalysis && formData.outputTemplates && formData.outputTemplates.length > 0 && (
                <div className="bg-success-50 rounded-lg p-4 border border-success-200">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="light" icon={CheckCircle} />
                        <div>
                            <h3 className="text-lg font-semibold text-success-800">Output Templates Uploaded</h3>
                            <p className="text-sm text-success-600">
                                {formData.outputTemplates.length} template{formData.outputTemplates.length !== 1 ? 's' : ''} uploaded successfully.
                                These will be processed when your project is created.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <Button
                    size="lg"
                    color="secondary"
                    iconLeading={ArrowLeft}
                    onClick={onPrevious}
                >
                    Back to Supporting Docs
                </Button>

                <div className="text-sm text-secondary">
                    Step 4 of 4
                </div>

                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    isDisabled={!canProceed}
                >
                    Create Project
                </Button>
            </div>

        </div>
    );
};