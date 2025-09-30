"use client";

import { useState, useCallback } from "react";
import { UploadCloud01, File02, ArrowLeft, CheckCircle, AlertCircle, Flash, Shield01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

interface Step4Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}

export const Step4GovernanceRules: React.FC<Step4Props> = ({
    formData,
    updateFormData,
    onNext,
    onPrevious
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadError, setUploadError] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const handleGovernanceUpload = useCallback(async (files: File[]) => {
        setIsUploading(true);
        setUploadError('');

        try {
            // Store the governance files
            const newRules = [...(formData.governanceRules || []), ...files];
            updateFormData({ governanceRules: newRules });

            // Simulate analysis
            setIsAnalyzing(true);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Update with mock analysis results
            updateFormData({
                governanceRulesAnalysis: {
                    documentCount: newRules.length,
                    approvalLevels: [
                        'Department Head (<$10,000)',
                        'Finance Director ($10,000 - $50,000)',
                        'CFO ($50,000 - $250,000)',
                        'CEO (>$250,000)',
                        'Board Approval (>$1,000,000)'
                    ],
                    workflows: [
                        'Standard Purchase Workflow',
                        'Emergency Procurement Process',
                        'Sole Source Justification',
                        'Contract Amendment Process'
                    ],
                    delegationMatrix: true,
                    auditRequirements: true,
                    status: 'analyzed'
                }
            });

        } catch (error) {
            console.error('Error uploading governance rules:', error);
            setUploadError('Failed to upload governance documents. Please try again.');
        } finally {
            setIsAnalyzing(false);
            setIsUploading(false);
        }
    }, [formData.governanceRules, updateFormData]);

    const handleRemoveRule = useCallback((index: number) => {
        const newRules = formData.governanceRules.filter((_: File, i: number) => i !== index);
        updateFormData({ governanceRules: newRules });
    }, [formData.governanceRules, updateFormData]);

    const handleCreateBase = async () => {
        setIsCreating(true);
        try {
            await onNext();
        } catch (error) {
            console.error('Error creating procurement base:', error);
            setIsCreating(false);
        }
    };

    const canProceed = formData.governanceRules?.length > 0;
    const canSkip = true; // Governance rules are optional

    const getTotalDocuments = () => {
        let total = 0;
        if (formData.policies?.length) total += formData.policies.length;
        if (formData.complianceDocs?.length) total += formData.complianceDocs.length;
        if (formData.standardTemplates?.length) total += formData.standardTemplates.length;
        if (formData.governanceRules?.length) total += formData.governanceRules.length;
        return total;
    };

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-primary mb-2">Upload Governance Rules</h3>
                <p className="text-sm text-tertiary">
                    Upload approval workflows, delegation matrices, and authorization policies that govern procurement decisions.
                </p>
                <p className="mt-2 text-xs text-warning-600 font-medium">
                    Optional: You can skip this step and add governance rules later.
                </p>
            </div>

            {/* File Upload Component */}
            <FileUpload.Root
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                multiple
                onFilesSelected={handleGovernanceUpload}
            >
                <FileUpload.Trigger>
                    <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-secondary p-6 text-center hover:border-brand-600 hover:bg-brand-50 transition-colors">
                        <FeaturedIcon icon={Shield01} size="lg" color="warning" />
                        <div>
                            <p className="font-semibold text-primary">Click to upload governance documents</p>
                            <p className="text-sm text-tertiary">or drag and drop</p>
                            <p className="mt-1 text-xs text-tertiary">PDF, DOC, DOCX, XLS, XLSX up to 10MB each</p>
                        </div>
                    </div>
                </FileUpload.Trigger>
            </FileUpload.Root>

            {uploadError && (
                <div className="flex items-center gap-2 rounded-lg bg-error-50 p-3 text-sm text-error-700">
                    <AlertCircle className="size-4" />
                    {uploadError}
                </div>
            )}

            {/* Uploaded Files List */}
            {formData.governanceRules?.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-primary">
                        Uploaded Governance Rules ({formData.governanceRules.length})
                    </h4>
                    {formData.governanceRules.map((file: File, index: number) => (
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
                                onClick={() => handleRemoveRule(index)}
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Analysis Results */}
            {formData.governanceRulesAnalysis && (
                <div className="rounded-lg bg-success-50 p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="size-5 text-success-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-success-900">Governance rules analyzed</p>
                            <p className="mt-1 text-sm text-success-700">
                                {formData.governanceRulesAnalysis.documentCount} documents processed
                            </p>

                            {formData.governanceRulesAnalysis.approvalLevels && (
                                <div className="mt-3">
                                    <p className="text-xs font-medium text-success-900">Approval levels identified:</p>
                                    <ul className="mt-1 space-y-0.5 text-xs text-success-700">
                                        {formData.governanceRulesAnalysis.approvalLevels.map((level: string, i: number) => (
                                            <li key={i} className="flex items-center gap-1">
                                                <span className="size-1 rounded-full bg-success-600"></span>
                                                {level}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="mt-3 flex gap-3">
                                {formData.governanceRulesAnalysis.delegationMatrix && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700">
                                        <CheckCircle className="size-3" />
                                        Delegation Matrix
                                    </span>
                                )}
                                {formData.governanceRulesAnalysis.auditRequirements && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700">
                                        <CheckCircle className="size-3" />
                                        Audit Requirements
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAnalyzing && (
                <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
                    <LoadingIndicator size="sm" />
                    <p className="text-sm text-blue-700">Analyzing governance structures...</p>
                </div>
            )}

            {/* Summary Card */}
            <div className="rounded-lg bg-brand-50 border border-brand-200 p-4">
                <div className="flex items-start gap-3">
                    <Flash className="size-5 text-brand-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-brand-900">Ready to Create Procurement Base</p>
                        <p className="mt-1 text-sm text-brand-700">
                            You have uploaded {getTotalDocuments()} documents across all categories.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                                <CheckCircle className="size-3 text-brand-600" />
                                <span className="text-brand-700">Policies: {formData.policies?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <CheckCircle className="size-3 text-brand-600" />
                                <span className="text-brand-700">Compliance: {formData.complianceDocs?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <CheckCircle className="size-3 text-brand-600" />
                                <span className="text-brand-700">Templates: {formData.standardTemplates?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <CheckCircle className="size-3 text-brand-600" />
                                <span className="text-brand-700">Governance: {formData.governanceRules?.length || 0}</span>
                            </div>
                        </div>
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
                    Back to Templates
                </Button>
                <div className="flex gap-3">
                    {canSkip && !formData.governanceRules?.length && (
                        <Button
                            size="lg"
                            color="tertiary"
                            onClick={handleCreateBase}
                            disabled={isCreating}
                        >
                            Skip & Create Base
                        </Button>
                    )}
                    <Button
                        size="lg"
                        color="primary"
                        iconLeading={Flash}
                        onClick={handleCreateBase}
                        disabled={(!canProceed && !canSkip) || isAnalyzing || isUploading || isCreating}
                    >
                        {isCreating ? 'Creating Base...' : 'Create Procurement Base'}
                    </Button>
                </div>
            </div>
        </div>
    );
};