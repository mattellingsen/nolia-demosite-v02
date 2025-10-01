"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud01, File02, ArrowRight, CheckCircle, AlertCircle, XCircle, BookOpen01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { InputBase } from "@/components/base/input/input";
import { analyzeDocumentViaAPI } from "@/lib/api-client";
import { type DocumentAnalysis } from "@/utils/browser-document-analyzer";

interface Step1Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
}

export const Step1UploadPolicies: React.FC<Step1Props> = ({
    formData,
    updateFormData,
    onNext
}) => {
    const [uploadError, setUploadError] = useState<string>('');
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState(false);

    // Base name validation states
    const [baseNameError, setBaseNameError] = useState<string>('');
    const [isCheckingName, setIsCheckingName] = useState(false);
    const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
    const checkNameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Check if base name is available
    const checkBaseNameAvailability = useCallback(async (name: string) => {
        if (!name || !name.trim()) {
            setBaseNameError('');
            setNameAvailable(null);
            return;
        }

        setIsCheckingName(true);
        setBaseNameError('');

        try {
            const response = await fetch(`/api/procurement-base/check-name?name=${encodeURIComponent(name.trim())}`);
            const data = await response.json();

            if (!response.ok) {
                setBaseNameError(data.error || 'Failed to check name availability');
                setNameAvailable(false);
            } else {
                if (data.available) {
                    setNameAvailable(true);
                    setBaseNameError('');
                } else {
                    setNameAvailable(false);
                    setBaseNameError(data.message || 'This name is already taken');
                }
            }
        } catch (error) {
            console.error('Error checking base name:', error);
            setBaseNameError('Unable to verify name availability');
            setNameAvailable(false);
        } finally {
            setIsCheckingName(false);
        }
    }, []);

    // Debounced base name validation
    const handleBaseNameChange = useCallback((value: string) => {
        updateFormData({ baseName: value });
        setNameAvailable(null); // Reset availability status while typing

        // Clear any existing timeout
        if (checkNameTimeoutRef.current) {
            clearTimeout(checkNameTimeoutRef.current);
        }

        // Set new timeout for debounced check
        checkNameTimeoutRef.current = setTimeout(() => {
            checkBaseNameAvailability(value);
        }, 500);
    }, [updateFormData, checkBaseNameAvailability]);

    const handlePolicyUpload = useCallback(async (files: File[]) => {
        setIsUploading(true);
        setUploadError('');

        try {
            // Store the policy files
            const newPolicies = [...(formData.policies || []), ...files];
            updateFormData({ policies: newPolicies });

            // Real analysis will happen via background processing after creation
            // Just show success state immediately for uploaded files
            updateFormData({
                policiesAnalysis: {
                    documentCount: newPolicies.length,
                    status: 'uploaded'
                }
            });

        } catch (error) {
            console.error('Error uploading policies:', error);
            setUploadError('Failed to upload policy documents. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [formData.policies, updateFormData]);

    const handleRemovePolicy = useCallback((index: number) => {
        const newPolicies = formData.policies.filter((_: File, i: number) => i !== index);
        updateFormData({ policies: newPolicies });
    }, [formData.policies, updateFormData]);

    const canProceed = formData.baseName?.trim() &&
                       nameAvailable === true &&
                       formData.policies?.length > 0;

    return (
        <div className="flex flex-col gap-8">
            {/* Base Name Input */}
            <div className="flex flex-col gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Knowledgebase Name</h3>
                    <p className="text-sm text-tertiary mb-4">
                        Choose a unique name for this knowledgebase configuration
                    </p>
                    <div className="relative">
                        <InputBase
                            label="Knowledgebase Name"
                            placeholder="e.g., Corporate Procurement Standards 2025"
                            value={formData.baseName || ''}
                            onChange={(e) => handleBaseNameChange(e.target.value)}
                            error={baseNameError}
                            success={nameAvailable === true}
                            hint={
                                isCheckingName ? "Checking availability..." :
                                nameAvailable === true ? "This name is available" :
                                nameAvailable === false ? baseNameError :
                                "Enter a unique name for this knowledgebase"
                            }
                        />
                        {isCheckingName && (
                            <div className="absolute right-3 top-9">
                                <LoadingIndicator size="sm" />
                            </div>
                        )}
                        {nameAvailable === true && (
                            <CheckCircle className="absolute right-3 top-9 size-5 text-success-600" />
                        )}
                        {nameAvailable === false && (
                            <XCircle className="absolute right-3 top-9 size-5 text-error-600" />
                        )}
                    </div>
                </div>

                {/* Description Input */}
                <div>
                    <InputBase
                        label="Description (Optional)"
                        placeholder="Brief description of this knowledgebase"
                        value={formData.description || ''}
                        onChange={(e) => updateFormData({ description: e.target.value })}
                        hint="Describe the purpose and scope of this knowledgebase"
                    />
                </div>
            </div>

            {/* Policy Upload Section */}
            <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Upload Documents</h3>
                <p className="text-sm text-tertiary mb-4">
                    Upload your organisation's global procurement documents. These will define the standard operating procedures for all procurement activities.
                </p>

                {/* File Upload Component */}
                <FileUpload.DropZone
                    accept=".pdf,.doc,.docx"
                    allowsMultiple={true}
                    maxSize={10 * 1024 * 1024} // 10MB
                    onDropFiles={handlePolicyUpload}
                    hint="PDF, DOC, DOCX up to 10MB each"
                    className="mb-4"
                />

                {uploadError && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-700">
                        <AlertCircle className="size-4" />
                        {uploadError}
                    </div>
                )}

                {/* Uploaded Files List */}
                {formData.policies?.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-primary">Uploaded Documents ({formData.policies.length})</h4>
                        {formData.policies.map((file: File, index: number) => (
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
                                    onClick={() => handleRemovePolicy(index)}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Analysis Results */}
                {formData.policiesAnalysis && (
                    <div className="mt-4 rounded-lg bg-success-50 p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="size-5 text-success-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-success-900">Documents uploaded successfully</p>
                                <p className="mt-1 text-sm text-success-700">
                                    {formData.policiesAnalysis.documentCount} documents ready for processing
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-secondary">
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    disabled={!canProceed || isUploading}
                >
                    Create Knowledgebase
                </Button>
            </div>
        </div>
    );
};