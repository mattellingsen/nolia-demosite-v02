"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, File02, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

interface Step3Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}

export const Step3StandardTemplates: React.FC<Step3Props> = ({
    formData,
    updateFormData,
    onNext,
    onPrevious
}) => {
    const [uploadError, setUploadError] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);

    const handleTemplateUpload = useCallback(async (files: File[]) => {
        setIsUploading(true);
        setUploadError('');

        try {
            // Store the template files
            const newTemplates = [...(formData.standardTemplates || []), ...files];
            updateFormData({ standardTemplates: newTemplates });

            // Real analysis will happen via background processing after creation
            // Just show success state immediately for uploaded files
            updateFormData({
                standardTemplatesAnalysis: {
                    documentCount: newTemplates.length,
                    status: 'uploaded'
                }
            });

        } catch (error) {
            console.error('Error uploading templates:', error);
            setUploadError('Failed to upload template documents. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [formData.standardTemplates, updateFormData]);

    const handleRemoveTemplate = useCallback((index: number) => {
        const newTemplates = formData.standardTemplates.filter((_: File, i: number) => i !== index);
        updateFormData({ standardTemplates: newTemplates });
    }, [formData.standardTemplates, updateFormData]);

    const canProceed = formData.standardTemplates?.length > 0;
    const canSkip = true; // Templates are optional

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Upload Standard Templates</h3>
                <p className="text-sm text-tertiary">
                    Upload reusable World Bank templates that can be used across different projects and departments.
                </p>
                <p className="mt-2 text-xs text-warning-600 font-medium">
                    Optional: You can skip this step if you don't have templates ready.
                </p>
            </div>

            {/* File Upload Component */}
            <FileUpload.DropZone
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                allowsMultiple={true}
                maxSize={10 * 1024 * 1024} // 10MB
                onDropFiles={handleTemplateUpload}
                hint="PDF, DOC, DOCX, XLS, XLSX up to 10MB each"
            />

            {uploadError && (
                <div className="flex items-center gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-700">
                    <AlertCircle className="size-4" />
                    {uploadError}
                </div>
            )}

            {/* Uploaded Files List */}
            {formData.standardTemplates?.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-primary">
                        Uploaded Templates ({formData.standardTemplates.length})
                    </h4>
                    {formData.standardTemplates.map((file: File, index: number) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border border-secondary p-3">
                            <div className="flex items-center gap-3">
                                <File02 className="size-5 text-tertiary" />
                                <div>
                                    <p className="text-sm font-medium text-primary">{file.name}</p>
                                    <p className="text-xs text-tertiary">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                color="tertiary"
                                onClick={() => handleRemoveTemplate(index)}
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Analysis Results */}
            {formData.standardTemplatesAnalysis && (
                <div className="rounded-lg bg-success-50 p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="size-5 text-success-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-success-900">Templates analyzed successfully</p>
                            <p className="mt-1 text-sm text-success-700">
                                {formData.standardTemplatesAnalysis.documentCount} templates processed
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div className="rounded bg-success-100 p-2">
                                    <p className="text-xs font-medium text-success-900">Fields Identified</p>
                                    <p className="text-lg font-semibold text-success-700">
                                        {formData.standardTemplatesAnalysis.fieldsIdentified}
                                    </p>
                                </div>
                                <div className="rounded bg-success-100 p-2">
                                    <p className="text-xs font-medium text-success-900">Reusable Components</p>
                                    <p className="text-lg font-semibold text-success-700">
                                        {formData.standardTemplatesAnalysis.reusableComponents}
                                    </p>
                                </div>
                            </div>

                            {formData.standardTemplatesAnalysis.templateTypes && (
                                <div className="mt-3">
                                    <p className="text-xs font-medium text-success-900">Template types found:</p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {formData.standardTemplatesAnalysis.templateTypes.map((type: string, i: number) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700"
                                            >
                                                {type}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Helper Information */}
            <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-primary mb-2">Common Template Types</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-tertiary">
                    <div>
                        <p className="font-medium text-primary">Sourcing Documents</p>
                        <ul className="mt-1 space-y-0.5">
                            <li>• Request for Proposal (RFP)</li>
                            <li>• Request for Quote (RFQ)</li>
                            <li>• Request for Information (RFI)</li>
                        </ul>
                    </div>
                    <div>
                        <p className="font-medium text-primary">Contract Templates</p>
                        <ul className="mt-1 space-y-0.5">
                            <li>• Purchase Orders</li>
                            <li>• Service Agreements</li>
                            <li>• NDAs and Confidentiality</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3 pt-6 border-t border-secondary">
                <Button
                    size="lg"
                    color="secondary"
                    iconLeading={ArrowLeft}
                    onClick={onPrevious}
                >
                    Back to Compliance
                </Button>
                <div className="flex gap-3">
                    {canSkip && !formData.standardTemplates?.length && (
                        <Button
                            size="lg"
                            color="tertiary"
                            onClick={onNext}
                        >
                            Skip Templates
                        </Button>
                    )}
                    <Button
                        size="lg"
                        color="primary"
                        iconTrailing={ArrowRight}
                        onClick={onNext}
                        disabled={(!canProceed && !canSkip) || isUploading}
                    >
                        Continue to Governance
                    </Button>
                </div>
            </div>
        </div>
    );
};
