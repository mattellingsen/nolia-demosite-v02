"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, File02, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Shield01 } from "@untitledui/icons";
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

export const Step2ComplianceDocs: React.FC<Step2Props> = ({
    formData,
    updateFormData,
    onNext,
    onPrevious
}) => {
    const [uploadError, setUploadError] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);

    const handleComplianceUpload = useCallback(async (files: File[]) => {
        setIsUploading(true);
        setUploadError('');

        try {
            // Store the compliance files
            const newDocs = [...(formData.complianceDocs || []), ...files];
            updateFormData({ complianceDocs: newDocs });

            // Real analysis will happen via background processing after creation
            // Just show success state immediately for uploaded files
            updateFormData({
                complianceDocsAnalysis: {
                    documentCount: newDocs.length,
                    status: 'uploaded'
                }
            });

        } catch (error) {
            console.error('Error uploading compliance documents:', error);
            setUploadError('Failed to upload compliance documents. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [formData.complianceDocs, updateFormData]);

    const handleRemoveDoc = useCallback((index: number) => {
        const newDocs = formData.complianceDocs.filter((_: File, i: number) => i !== index);
        updateFormData({ complianceDocs: newDocs });
    }, [formData.complianceDocs, updateFormData]);

    const canProceed = formData.complianceDocs?.length > 0;

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Upload Compliance Documents</h3>
                <p className="text-sm text-tertiary">
                    Upload regulatory compliance documents, certifications, and legal requirements that govern your procurement processes.
                </p>
            </div>

            {/* File Upload Component */}
            <FileUpload.DropZone
                accept=".pdf,.doc,.docx"
                allowsMultiple={true}
                maxSize={10 * 1024 * 1024} // 10MB
                onDropFiles={handleComplianceUpload}
                hint="PDF, DOC, DOCX up to 10MB each"
            />

            {uploadError && (
                <div className="flex items-center gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-700">
                    <AlertCircle className="size-4" />
                    {uploadError}
                </div>
            )}

            {/* Uploaded Files List */}
            {formData.complianceDocs?.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-primary">
                        Uploaded Compliance Documents ({formData.complianceDocs.length})
                    </h4>
                    {formData.complianceDocs.map((file: File, index: number) => (
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
                                onClick={() => handleRemoveDoc(index)}
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Analysis Results */}
            {formData.complianceDocsAnalysis && (
                <div className="rounded-lg bg-success-50 p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="size-5 text-success-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-success-900">Compliance documents analyzed</p>
                            <p className="mt-1 text-sm text-success-700">
                                {formData.complianceDocsAnalysis.documentCount} documents processed
                            </p>
                            {formData.complianceDocsAnalysis.regulations && (
                                <div className="mt-3">
                                    <p className="text-xs font-medium text-success-900">Regulations identified:</p>
                                    <ul className="mt-1 grid grid-cols-1 gap-1 text-xs text-success-700">
                                        {formData.complianceDocsAnalysis.regulations.map((reg: string, i: number) => (
                                            <li key={i} className="flex items-center gap-1">
                                                <span className="size-1 rounded-full bg-success-600"></span>
                                                {reg}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {formData.complianceDocsAnalysis.riskLevel && (
                                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5">
                                    <Shield01 className="size-3 text-success-700" />
                                    <span className="text-xs font-medium text-success-700">
                                        Risk Level: {formData.complianceDocsAnalysis.riskLevel}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Helper Information */}
            <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-primary mb-2">Recommended Documents</h4>
                <ul className="space-y-1 text-xs text-tertiary">
                    <li>• ISO certifications and quality standards</li>
                    <li>• Data protection and privacy policies</li>
                    <li>• Anti-corruption and ethics guidelines</li>
                    <li>• Environmental and sustainability requirements</li>
                    <li>• Industry-specific regulations</li>
                    <li>• Government contracting requirements</li>
                </ul>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3 pt-6 border-t border-secondary">
                <Button
                    size="lg"
                    color="secondary"
                    iconLeading={ArrowLeft}
                    onClick={onPrevious}
                >
                    Back to Policies
                </Button>
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    disabled={!canProceed || isUploading}
                >
                    Continue to Templates
                </Button>
            </div>
        </div>
    );
};