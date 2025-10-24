"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud01, File02, ArrowRight, CheckCircle, AlertCircle, XCircle, Folder } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { InputBase } from "@/components/base/input/input";
import { useWorldBankGroupBases } from "@/hooks/useWorldBankGroupBase";

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

    // Fetch knowledge bases from admin
    const { data: bases, isLoading: basesLoading, error: basesError } = useWorldBankGroupBases();

    // Project name validation states
    const [tenderNameError, setTenderNameError] = useState<string>('');
    const [isCheckingName, setIsCheckingName] = useState(false);
    const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
    const checkNameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Check if project name is available (WorldBankGroup endpoint)
    const checkTenderNameAvailability = useCallback(async (name: string) => {
        if (!name || !name.trim()) {
            setTenderNameError('');
            setNameAvailable(null);
            return;
        }

        setIsCheckingName(true);
        setTenderNameError('');

        try {
            console.log('[WorldBankGroup] Checking project name availability:', name);
            const response = await fetch(`/api/worldbankgroup-projects/check-name?name=${encodeURIComponent(name.trim())}`);
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
            console.error('[WorldBankGroup] Error checking project name:', error);
            setTenderNameError('Unable to verify name availability');
            setNameAvailable(false);
        } finally {
            setIsCheckingName(false);
        }
    }, []);

    // Debounced project name validation
    const handleTenderNameChange = useCallback((value: string) => {
        updateFormData({ projectName: value });
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
        const filesArray = Array.from(files);
        if (filesArray.length === 0) return;

        setIsUploading(true);
        setUploadError('');

        try {
            // Store the pre-RFP files (support multiple)
            const existingFiles = formData.submissionForm || [];
            const newFiles = Array.isArray(existingFiles) ? [...existingFiles, ...filesArray] : filesArray;
            updateFormData({ submissionForm: newFiles });

            // Real analysis will happen via background processing after creation
            // Just show success state immediately for uploaded files
            updateFormData({
                submissionFormAnalysis: {
                    status: 'uploaded',
                    documentCount: newFiles.length
                }
            });

        } catch (error) {
            console.error('[WorldBankGroup] Error uploading documents:', error);
            setUploadError('Failed to upload documents. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [formData.submissionForm, updateFormData]);

    const handleRemovePreRfpFile = useCallback((index: number) => {
        const files = Array.isArray(formData.submissionForm) ? formData.submissionForm : [formData.submissionForm];
        const newFiles = files.filter((_: File, i: number) => i !== index);
        updateFormData({
            submissionForm: newFiles.length > 0 ? newFiles : null,
            submissionFormAnalysis: newFiles.length > 0 ? { status: 'uploaded', documentCount: newFiles.length } : null
        });
    }, [formData.submissionForm, updateFormData]);

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

    const canProceed = formData.selectedKnowledgeBase &&
                       formData.projectName?.trim() &&
                       nameAvailable === true &&
                       formData.submissionForm;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Knowledge Base Selection */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <div className="mb-4">
                        <p className="text-lg text-secondary">
                            Select the global knowledge base for this project.
                        </p>
                    </div>
                    <div className="relative select-custom">
                        {basesError ? (
                            <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-700">
                                Failed to load knowledge bases. Please try refreshing the page.
                            </div>
                        ) : bases && bases.length === 0 ? (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>No knowledge bases available.</strong> You need to create a knowledge base first in the WorldBankGroup Admin Setup section.
                                </p>
                                <Button
                                    size="sm"
                                    color="primary"
                                    href="/worldbankgroup-admin/setup"
                                    className="mt-2"
                                >
                                    Go to Admin Setup
                                </Button>
                            </div>
                        ) : (
                            <Select
                                placeholder={basesLoading ? "Loading knowledge bases..." : "Select knowledge base"}
                                size="md"
                                items={bases ? bases.map(base => ({
                                    id: base.id,
                                    label: base.name,
                                    supportingText: base.status.toLowerCase()
                                })) : []}
                                placeholderIcon={Folder}
                                className="w-full"
                                isDisabled={basesLoading || !bases || bases.length === 0}
                                selectedKey={formData.selectedKnowledgeBase?.id}
                                onSelectionChange={(selectedId) => {
                                    if (selectedId) {
                                        const base = bases?.find(b => b.id === selectedId);
                                        updateFormData({ selectedKnowledgeBase: base });
                                    }
                                }}
                            >
                                {(item) => <Select.Item key={item.id}>{item.label}</Select.Item>}
                            </Select>
                        )}
                        <style jsx global>{`
                            .select-custom button {
                                border: 1px solid #3497B8 !important;
                                box-shadow: 0 0 0 8px #F2FAFC !important;
                                border-radius: 0.5rem !important;
                            }
                            .select-custom button:focus {
                                border: 1px solid #3497B8 !important;
                                box-shadow: 0 0 0 8px #F2FAFC !important;
                            }
                        `}</style>
                    </div>
                </div>
            </div>

            {/* Project Name Input */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <div className="mb-1">
                        <p className="text-lg text-secondary">
                            Start by naming your project.
                        </p>
                    </div>
                    <div className="relative">
                        <InputBase
                            label="Project Name"
                            placeholder="e.g., Indonesia Health Systems Strengthening Project"
                            value={formData.projectName || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTenderNameChange(e.target.value)}
                            size="md"
                            error={tenderNameError}
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
                        {tenderNameError && !isCheckingName && (
                            <p className="mt-2 text-sm text-error-600 flex items-center gap-1">
                                <XCircle className="w-4 h-4" />
                                {tenderNameError}
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

            {/* Pre-RFx Document Upload Section */}
            <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                    <div className="mb-4">
                        <p className="text-lg text-secondary">
                            Upload your business case and other relevant documentation that informed your RFx.
                        </p>
                    </div>
                    <FileUpload.DropZone
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        allowsMultiple={true}
                        maxSize={10 * 1024 * 1024} // 10MB
                        onDropFiles={handleFileUpload}
                        hint="PDF, DOC, DOCX, XLS, XLSX up to 10MB each"
                        className="!bg-white !border !border-brand-secondary-600 min-h-64 py-12 !flex !items-center !justify-center !rounded-lg upload-dropzone-custom mb-4"
                    />

                    {uploadError && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-700">
                            <AlertCircle className="size-4" />
                            {uploadError}
                        </div>
                    )}

                    {/* Uploaded Files Display */}
                    {formData.submissionForm && (() => {
                        const files = Array.isArray(formData.submissionForm) ? formData.submissionForm : [formData.submissionForm];
                        return (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-primary">Uploaded Documents ({files.length})</h4>
                                {files.map((file: File, index: number) => (
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
                                            onClick={() => handleRemovePreRfpFile(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}

                    {/* Upload Success */}
                    {formData.submissionFormAnalysis && (() => {
                        const count = formData.submissionFormAnalysis.documentCount || 1;
                        const isPlural = count > 1;
                        return (
                            <div className="mt-4 rounded-lg bg-success-50 p-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="size-5 text-success-600 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-success-900">
                                            {isPlural ? 'Documents' : 'Document'} ready for upload
                                        </p>
                                        <p className="mt-1 text-sm text-success-700">
                                            {count} {isPlural ? 'documents' : 'document'} will be processed when your project is created
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
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
                    Continue to RFx Document
                </Button>
            </div>
        </div>
    );
};
