"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud01, File02, ArrowRight, CheckCircle, AlertCircle, XCircle, BookOpen01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { InputBase } from "@/components/base/input/input";
import { cx } from "@/utils/cx";

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

    // Check if base name is available (WorldBankGroup API)
    const checkBaseNameAvailability = useCallback(async (name: string) => {
        if (!name || !name.trim()) {
            setBaseNameError('');
            setNameAvailable(null);
            return;
        }

        setIsCheckingName(true);
        setBaseNameError('');

        try {
            const response = await fetch(`/api/worldbankgroup-base/check-name?name=${encodeURIComponent(name.trim())}`);
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
            console.error('[WorldBankGroup] Error checking base name:', error);
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

            // FAKE DEMO: Just show success state immediately
            updateFormData({
                policiesAnalysis: {
                    documentCount: newPolicies.length,
                    status: 'uploaded'
                }
            });

        } catch (error) {
            console.error('[WorldBankGroup] Error uploading policies:', error);
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
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Base Name Input */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <div className="mb-1">
                        <p className="text-lg text-secondary">
                            Start by naming your knowledge base.
                        </p>
                    </div>
                    <div className="relative">
                        <InputBase
                            label="Knowledge Base Name"
                            placeholder="e.g., Corporate World Bank Group Standards 2025"
                            value={formData.baseName || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBaseNameChange(e.target.value)}
                            size="md"
                            error={baseNameError}
                            className="w-full"
                        />

                        {/* Success message */}
                        {!isCheckingName && nameAvailable === true && (
                            <p className="mt-2 text-sm text-success-600 flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                This name is available
                            </p>
                        )}

                        {/* Error message */}
                        {baseNameError && !isCheckingName && (
                            <p className="mt-2 text-sm text-error-600 flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                {baseNameError}
                            </p>
                        )}
                        <style jsx global>{`
                            input {
                                border: 1px solid #3497B8 !important;
                                box-shadow: 0 0 0 8px #F2FAFC !important;
                                border-radius: 0.5rem !important;
                            }
                            input:focus {
                                border: 1px solid #3497B8 !important;
                                box-shadow: 0 0 0 8px #F2FAFC !important;
                                outline: none !important;
                                ring: none !important;
                            }
                            .upload-dropzone-custom {
                                box-shadow: 0 0 0 8px #F2FAFC !important;
                            }
                        `}</style>
                    </div>
                </div>
            </div>

            {/* Description Input */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <InputBase
                        label="Description (Optional)"
                        placeholder="Brief description of this knowledge base"
                        value={formData.description || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData({ description: e.target.value })}
                        hint="Describe the purpose and scope of this knowledge base"
                        size="md"
                        className="w-full"
                    />
                </div>
            </div>

            {/* Policy Upload Section */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <div className="mb-4">
                        <p className="text-lg text-secondary">
                            Upload all relevant World Bank Group documentation for the knowledge base you require — Policies, Rules, Templates, Standards, etc.
                        </p>
                    </div>
                    <FileUpload.DropZone
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        allowsMultiple={true}
                        maxSize={10 * 1024 * 1024} // 10MB
                        onDropFiles={(files: FileList) => {
                            const filesArray = Array.from(files);
                            handlePolicyUpload(filesArray);
                        }}
                        hint="PDF, DOC, DOCX, XLS, XLSX up to 10MB each"
                        className="!bg-white !border !border-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center !rounded-lg upload-dropzone-custom mb-4"
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
                                    <p className="font-medium text-success-900">Documents ready for upload</p>
                                    <p className="mt-1 text-sm text-success-700">
                                        {formData.policiesAnalysis.documentCount} documents ready for processing
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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
                    Create Knowledge Base
                </Button>
            </div>
        </div>
    );
};
