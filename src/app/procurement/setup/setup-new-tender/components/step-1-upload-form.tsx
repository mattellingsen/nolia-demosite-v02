"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud01, File02, ArrowRight, CheckCircle, AlertCircle, XCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { InputBase } from "@/components/base/input/input";

interface Step1Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
}

export const Step1UploadForm: React.FC<Step1Props> = ({
    formData,
    updateFormData,
    onNext
}) => {
    const [uploadError, setUploadError] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);

    // Tender name validation states
    const [tenderNameError, setTenderNameError] = useState<string>('');
    const [isCheckingName, setIsCheckingName] = useState(false);
    const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
    const checkNameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Check if tender name is available
    const checkTenderNameAvailability = useCallback(async (name: string) => {
        if (!name || !name.trim()) {
            setTenderNameError('');
            setNameAvailable(null);
            return;
        }

        setIsCheckingName(true);
        setTenderNameError('');

        try {
            const response = await fetch(`/api/tenders/check-name?name=${encodeURIComponent(name.trim())}`);
            const data = await response.json();

            if (!response.ok) {
                setTenderNameError(data.error || 'Failed to check name availability');
                setNameAvailable(false);
            } else {
                if (data.available) {
                    setNameAvailable(true);
                    setTenderNameError('');
                } else {
                    setNameAvailable(false);
                    setTenderNameError(data.message || 'This name is already taken');
                }
            }
        } catch (error) {
            console.error('Error checking tender name:', error);
            setTenderNameError('Unable to verify name availability');
            setNameAvailable(false);
        } finally {
            setIsCheckingName(false);
        }
    }, []);

    // Debounced tender name validation
    const handleTenderNameChange = useCallback((value: string) => {
        updateFormData({ tenderName: value });
        setNameAvailable(null); // Reset availability status while typing

        // Clear any existing timeout
        if (checkNameTimeoutRef.current) {
            clearTimeout(checkNameTimeoutRef.current);
        }

        // Set new timeout for debounced check
        checkNameTimeoutRef.current = setTimeout(() => {
            checkTenderNameAvailability(value);
        }, 500);
    }, [updateFormData, checkTenderNameAvailability]);

    const handleFileUpload = useCallback(async (files: FileList) => {
        const file = files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError('');

        try {
            // Store the pre-RFP file
            updateFormData({ submissionForm: file });

            // Real analysis will happen via background processing after creation
            // Just show success state immediately for uploaded file
            updateFormData({
                submissionFormAnalysis: {
                    status: 'uploaded'
                }
            });

        } catch (error) {
            console.error('Error uploading document:', error);
            setUploadError('Failed to upload document. Please try again.');
        } finally {
            setIsUploading(false);
        }
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

    const canProceed = formData.tenderName?.trim() &&
                       nameAvailable === true &&
                       formData.submissionForm;

    return (
        <div className="flex flex-col gap-8">
            {/* Tender Name Input */}
            <div className="flex flex-col gap-6">
                <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Tender Project Name</h3>
                    <p className="text-sm text-tertiary mb-4">
                        Choose a unique name for this tender project
                    </p>
                    <div className="relative">
                        <InputBase
                            label="Tender Project Name"
                            placeholder="e.g., Corporate IT Infrastructure Upgrade 2025"
                            value={formData.tenderName || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTenderNameChange(e.target.value)}
                            error={tenderNameError}
                            success={nameAvailable === true ? true : undefined}
                            hint={
                                isCheckingName ? "Checking availability..." :
                                nameAvailable === true ? "This name is available" :
                                nameAvailable === false ? tenderNameError :
                                "Enter a unique name for this tender project"
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
            </div>

            {/* Pre-RFP Document Upload Section */}
            <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Upload Pre-RFP Documents</h3>
                <p className="text-sm text-tertiary mb-4">
                    Upload your business case and other relevant documentation that informed your RFP.
                </p>

                {/* File Upload Component */}
                <FileUpload.DropZone
                    accept=".pdf,.doc,.docx"
                    allowsMultiple={false}
                    maxSize={10 * 1024 * 1024} // 10MB
                    onDropFiles={handleFileUpload}
                    hint="PDF, DOC, DOCX up to 10MB"
                    className="mb-4"
                />

                {uploadError && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-700">
                        <AlertCircle className="size-4" />
                        {uploadError}
                    </div>
                )}

                {/* Uploaded File Display */}
                {formData.submissionForm && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-primary">Uploaded Document</h4>
                        <div className="flex items-center justify-between rounded-lg border border-secondary p-3">
                            <div className="flex items-center gap-3">
                                <File02 className="size-5 text-tertiary" />
                                <div>
                                    <p className="text-sm font-medium text-primary">{formData.submissionForm.name}</p>
                                    <p className="text-xs text-tertiary">
                                        {(formData.submissionForm.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                color="tertiary"
                                onClick={() => {
                                    updateFormData({ submissionForm: null, submissionFormAnalysis: null });
                                }}
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                )}

                {/* Upload Success */}
                {formData.submissionFormAnalysis && (
                    <div className="mt-4 rounded-lg bg-success-50 p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="size-5 text-success-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-success-900">Document uploaded successfully</p>
                                <p className="mt-1 text-sm text-success-700">
                                    Document ready for processing
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Example Document Types */}
            <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-md font-semibold text-primary mb-4">Example Document Types</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <FeaturedIcon size="sm" color="gray" theme="light" icon={File02} />
                        <div>
                            <p className="text-sm font-medium text-primary">Business Case</p>
                            <p className="text-xs text-secondary">Project justification</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <FeaturedIcon size="sm" color="gray" theme="light" icon={File02} />
                        <div>
                            <p className="text-sm font-medium text-primary">Requirements Document</p>
                            <p className="text-xs text-secondary">Needs assessment</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <FeaturedIcon size="sm" color="gray" theme="light" icon={File02} />
                        <div>
                            <p className="text-sm font-medium text-primary">Budget Estimates</p>
                            <p className="text-xs text-secondary">Financial planning</p>
                        </div>
                    </div>
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
                    Continue to RFP Document
                </Button>
            </div>
        </div>
    );
};