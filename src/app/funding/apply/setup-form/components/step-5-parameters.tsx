"use client";

import { useState } from "react";
import { Settings01, ArrowRight, ArrowLeft, Calendar, Bell01, CreditCard01, Users01, Folder } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Toggle } from "@/components/base/toggle/toggle";
import { Select } from "@/components/base/select/select";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { useFunds } from "@/hooks/useFunds";

interface Step5Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
    stepType?: 'basic' | 'configuration'; // New prop to control which sections to show
}

export const Step5Parameters: React.FC<Step5Props> = ({ 
    formData, 
    updateFormData, 
    onNext,
    onPrevious,
    stepType = 'basic'
}) => {
    // Fetch funds from database
    const { data: funds, isLoading: fundsLoading, error: fundsError } = useFunds();
    const [localParams, setLocalParams] = useState({
        startDate: formData.parameters?.startDate || '',
        endDate: formData.parameters?.endDate || '',
        isAlwaysOpen: formData.parameters?.isAlwaysOpen || false,
        notifications: {
            applicationCount: formData.parameters?.notificationSettings?.applicationCount || '',
            fundingPercentage: formData.parameters?.notificationSettings?.fundingPercentage || '',
            emailNotifications: formData.parameters?.notificationSettings?.emailNotifications ?? true,
            slackNotifications: formData.parameters?.notificationSettings?.slackNotifications ?? false,
            weeklyReports: formData.parameters?.notificationSettings?.weeklyReports ?? true
        },
        applicationLimits: {
            maxApplications: formData.parameters?.applicationLimits?.maxApplications || '',
            maxPerOrganization: formData.parameters?.applicationLimits?.maxPerOrganization || 1,
            requireUniqueEmails: formData.parameters?.applicationLimits?.requireUniqueEmails ?? true
        },
        accessibility: {
            enableMultiLanguage: formData.parameters?.accessibility?.enableMultiLanguage ?? false,
            supportedLanguages: formData.parameters?.accessibility?.supportedLanguages || ['English'],
            enableScreenReader: formData.parameters?.accessibility?.enableScreenReader ?? true,
            enableKeyboardNav: formData.parameters?.accessibility?.enableKeyboardNav ?? true
        },
        customization: {
            brandColor: formData.parameters?.customization?.brandColor || '#6366F1',
            logoUrl: formData.parameters?.customization?.logoUrl || '',
            customDomain: formData.parameters?.customization?.customDomain || '',
            thankYouMessage: formData.parameters?.customization?.thankYouMessage || 'Thank you for your application. We will review it and get back to you soon.'
        }
    });

    const updateLocalParams = (section: string, field: string, value: any) => {
        const updated = {
            ...localParams,
            [section]: {
                ...localParams[section as keyof typeof localParams],
                [field]: value
            }
        };
        setLocalParams(updated);
        
        // Update parent form data
        updateFormData({
            parameters: {
                ...updated,
                notificationSettings: updated.notifications
            }
        });
    };

    const updateTopLevel = (field: string, value: any) => {
        const updated = {
            ...localParams,
            [field]: value
        };
        setLocalParams(updated);
        
        updateFormData({
            parameters: {
                ...updated,
                notificationSettings: updated.notifications
            }
        });
    };

    const toggleNotification = (field: string) => {
        updateLocalParams('notifications', field, !localParams.notifications[field as keyof typeof localParams.notifications]);
    };

    const isFormValid = () => {
        if (stepType === 'basic') {
            // Must have a fund selected and either always open or start/end dates
            const hasFund = formData.selectedFund && formData.selectedFund.id;
            const hasValidDateConfig = localParams.isAlwaysOpen || (localParams.startDate && localParams.endDate);
            return hasFund && hasValidDateConfig;
        }
        // Configuration step is always valid (all fields optional)
        return true;
    };

    const getStepTitle = () => {
        // No title for either step
        return null;
    };

    const getStepDescription = () => {
        if (stepType === 'basic') {
            return 'Set up the application period and limits.';
        }
        return 'Configure notifications and customize your application form branding.';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Fund Selection - Only show in basic step */}
            {stepType === 'basic' && (
                <div className="flex justify-center mb-8">
                    <div className="w-full max-w-md">
                        <div className="mb-4 text-center">
                            <p className="text-lg text-secondary">
                                Select the fund to base your application form on
                            </p>
                        </div>
                        <div className="relative select-custom">
                            {fundsError ? (
                                <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-700">
                                    Failed to load funds. Please try refreshing the page.
                                </div>
                            ) : funds && funds.length === 0 ? (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>No funds available.</strong> You need to create a fund first in the Setup section before creating application forms.
                                    </p>
                                    <Button 
                                        size="sm" 
                                        color="primary" 
                                        href="/funding/setup"
                                        className="mt-2"
                                    >
                                        Go to Setup
                                    </Button>
                                </div>
                            ) : (
                                <Select
                                    placeholder={fundsLoading ? "Loading funds..." : "Select fund"}
                                    size="md"
                                    items={funds ? funds.map(fund => ({ 
                                        id: fund.id, 
                                        label: fund.name,
                                        supportingText: fund.status.toLowerCase()
                                    })) : []}
                                    placeholderIcon={Folder}
                                    className="w-full"
                                    isDisabled={fundsLoading || !funds || funds.length === 0}
                                    onSelectionChange={(selectedId) => {
                                        if (selectedId) {
                                            const selectedFund = funds?.find(fund => fund.id === selectedId);
                                            updateFormData({ selectedFund });
                                        }
                                    }}
                                >
                                    {(item) => <Select.Item>{item.label}</Select.Item>}
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
                                    outline: none !important;
                                    ring: none !important;
                                }
                                .date-picker-custom button {
                                    border: 1px solid #3497B8 !important;
                                    box-shadow: 0 0 0 8px #F2FAFC !important;
                                    border-radius: 0.5rem !important;
                                    background-color: white !important;
                                }
                                .date-picker-custom button:focus {
                                    border: 1px solid #3497B8 !important;
                                    box-shadow: 0 0 0 8px #F2FAFC !important;
                                    outline: none !important;
                                    ring: none !important;
                                }
                                .input-custom input,
                                .input-custom textarea {
                                    border: 1px solid #3497B8 !important;
                                    box-shadow: 0 0 0 8px #F2FAFC !important;
                                    border-radius: 0.5rem !important;
                                    background-color: white !important;
                                    --tw-ring-shadow: 0 0 0 8px #F2FAFC !important;
                                    --tw-shadow: 0 0 0 8px #F2FAFC !important;
                                }
                                .input-custom input:focus,
                                .input-custom textarea:focus {
                                    border: 1px solid #3497B8 !important;
                                    box-shadow: 0 0 0 8px #F2FAFC !important;
                                    outline: none !important;
                                    ring: none !important;
                                    --tw-ring-shadow: 0 0 0 8px #F2FAFC !important;
                                    --tw-shadow: 0 0 0 8px #F2FAFC !important;
                                    --tw-ring-color: transparent !important;
                                }
                                /* More specific targeting for configuration step */
                                .input-custom input[type="number"],
                                .input-custom input[type="url"],
                                .input-custom input[type="text"],
                                .input-custom textarea {
                                    background: white !important;
                                    border-color: #3497B8 !important;
                                    border-width: 1px !important;
                                    border-style: solid !important;
                                }
                                .input-custom input[type="number"]:focus,
                                .input-custom input[type="url"]:focus,
                                .input-custom input[type="text"]:focus,
                                .input-custom textarea:focus {
                                    background: white !important;
                                    border-color: #3497B8 !important;
                                    border-width: 1px !important;
                                    border-style: solid !important;
                                }
                            `}</style>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="text-center space-y-4">
                <div>
                    {getStepTitle() && (
                        <h2 className="text-display-sm font-semibold text-primary mb-2">
                            {getStepTitle()}
                        </h2>
                    )}
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        {getStepDescription()}
                    </p>
                </div>
            </div>

            {/* Form Sections */}
            <div className="space-y-8">
                {/* Date Configuration - Only show in basic step */}
                {stepType === 'basic' && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="light" icon={Calendar} />
                        <h3 className="text-lg font-semibold text-primary">Application Period</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Always Open Toggle */}
                        <div className="p-4 bg-white rounded-lg">
                            <Toggle
                                label="Always Accept Applications"
                                hint="Keep the application form open indefinitely"
                                isSelected={localParams.isAlwaysOpen}
                                onChange={() => updateTopLevel('isAlwaysOpen', !localParams.isAlwaysOpen)}
                                size="md"
                            />
                        </div>

                        {/* Date Inputs */}
                        {!localParams.isAlwaysOpen && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Start Date & Time
                                    </label>
                                    <div className="date-picker-custom">
                                        <DatePicker
                                            onChange={(date) => updateTopLevel('startDate', date?.toString() || '')}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        End Date & Time
                                    </label>
                                    <div className="date-picker-custom">
                                        <DatePicker
                                            onChange={(date) => updateTopLevel('endDate', date?.toString() || '')}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* Application Limits - Only show in basic step */}
                {stepType === 'basic' && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="purple" theme="light" icon={Users01} />
                        <h3 className="text-lg font-semibold text-primary">Application Limits</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Maximum total applications (optional)
                            </label>
                            <div className="input-custom">
                                <input
                                    type="number"
                                    value={localParams.applicationLimits.maxApplications}
                                    onChange={(e) => updateLocalParams('applicationLimits', 'maxApplications', e.target.value)}
                                    placeholder="Leave empty for unlimited"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Max applications per organization
                            </label>
                            <div className="input-custom">
                                <input
                                    type="number"
                                    value={localParams.applicationLimits.maxPerOrganization}
                                    onChange={(e) => updateLocalParams('applicationLimits', 'maxPerOrganization', parseInt(e.target.value))}
                                    min="1"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg">
                        <Toggle
                            label="Require unique email addresses"
                            hint="Prevent duplicate applications from the same email"
                            isSelected={localParams.applicationLimits.requireUniqueEmails}
                            onChange={() => updateLocalParams('applicationLimits', 'requireUniqueEmails', !localParams.applicationLimits.requireUniqueEmails)}
                            size="sm"
                        />
                    </div>
                </div>
                )}

                {/* Notification Settings - Only show in configuration step */}
                {stepType === 'configuration' && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="warning" theme="light" icon={Bell01} />
                        <h3 className="text-lg font-semibold text-primary">Notification Settings</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Notify when application count reaches:
                            </label>
                            <div className="input-custom">
                                <input
                                    type="number"
                                    value={localParams.notifications.applicationCount}
                                    onChange={(e) => updateLocalParams('notifications', 'applicationCount', e.target.value)}
                                    placeholder="e.g. 50"
                                    className="w-full px-3 py-2"
                                    style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #3497B8',
                                        boxShadow: '0 0 0 8px #F2FAFC',
                                        borderRadius: '0.5rem'
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Notify when funding reaches (% of total):
                            </label>
                            <div className="input-custom">
                                <input
                                    type="number"
                                    value={localParams.notifications.fundingPercentage}
                                    onChange={(e) => updateLocalParams('notifications', 'fundingPercentage', e.target.value)}
                                    placeholder="e.g. 80"
                                    max="100"
                                    className="w-full px-3 py-2"
                                    style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #3497B8',
                                        boxShadow: '0 0 0 8px #F2FAFC',
                                        borderRadius: '0.5rem'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-primary">Notification Channels:</p>
                        {[
                            { key: 'emailNotifications', label: 'Email notifications', description: 'Send alerts via email' },
                            { key: 'weeklyReports', label: 'Weekly summary reports', description: 'Receive weekly application summaries' }
                        ].map(item => (
                            <div key={item.key} className="p-3 bg-white rounded-lg">
                                <Toggle
                                    label={item.label}
                                    hint={item.description}
                                    isSelected={localParams.notifications[item.key as keyof typeof localParams.notifications]}
                                    onChange={() => toggleNotification(item.key)}
                                    size="sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {/* Customization - Only show in configuration step */}
                {stepType === 'configuration' && (
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="success" theme="light" icon={CreditCard01} />
                        <h3 className="text-lg font-semibold text-primary">Branding & Customization</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Brand Color
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={localParams.customization.brandColor}
                                    onChange={(e) => updateLocalParams('customization', 'brandColor', e.target.value)}
                                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                                />
                                <div className="flex-1 input-custom">
                                    <input
                                        type="text"
                                        value={localParams.customization.brandColor}
                                        onChange={(e) => updateLocalParams('customization', 'brandColor', e.target.value)}
                                        className="w-full px-3 py-2"
                                        style={{
                                            backgroundColor: 'white',
                                            border: '1px solid #3497B8',
                                            boxShadow: '0 0 0 8px #F2FAFC',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Logo URL (optional)
                            </label>
                            <div className="input-custom">
                                <input
                                    type="url"
                                    value={localParams.customization.logoUrl}
                                    onChange={(e) => updateLocalParams('customization', 'logoUrl', e.target.value)}
                                    placeholder="https://yourlogo.com/logo.png"
                                    className="w-full px-3 py-2"
                                    style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #3497B8',
                                        boxShadow: '0 0 0 8px #F2FAFC',
                                        borderRadius: '0.5rem'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Thank You Message
                        </label>
                        <div className="input-custom">
                            <textarea
                                value={localParams.customization.thankYouMessage}
                                onChange={(e) => updateLocalParams('customization', 'thankYouMessage', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2"
                                placeholder="Message shown to applicants after successful submission..."
                                style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #3497B8',
                                    boxShadow: '0 0 0 8px #F2FAFC',
                                    borderRadius: '0.5rem'
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Custom Domain (optional)
                        </label>
                        <div className="input-custom">
                            <input
                                type="text"
                                value={localParams.customization.customDomain}
                                onChange={(e) => updateLocalParams('customization', 'customDomain', e.target.value)}
                                placeholder="apply.yourcompany.com"
                                className="w-full px-3 py-2"
                                style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #3497B8',
                                    boxShadow: '0 0 0 8px #F2FAFC',
                                    borderRadius: '0.5rem'
                                }}
                            />
                        </div>
                        <p className="text-xs text-secondary mt-1">
                            Contact support to configure your custom domain
                        </p>
                    </div>
                </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <div className="flex items-center gap-4">
                    {stepType === 'configuration' && (
                        <Button
                            size="lg"
                            color="tertiary"
                            iconLeading={ArrowLeft}
                            onClick={onPrevious}
                        >
                            Previous
                        </Button>
                    )}
                    <div className="text-sm text-secondary">
                        Step {stepType === 'basic' ? '1' : '2'} of 3
                    </div>
                </div>
                
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    isDisabled={!isFormValid()}
                >
                    {stepType === 'basic' ? 'Continue to Configuration' : 'Preview & Launch'}
                </Button>
            </div>

        </div>
    );
};