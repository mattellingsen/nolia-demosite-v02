"use client";

import { useState } from "react";
import { Settings01, ArrowRight, ArrowLeft, Calendar, Bell01, CreditCard01, Users01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Toggle } from "@/components/base/toggle/toggle";

interface Step5Props {
    formData: any;
    updateFormData: (updates: any) => void;
    onNext: () => void;
    onPrevious: () => void;
}

export const Step5Parameters: React.FC<Step5Props> = ({ 
    formData, 
    updateFormData, 
    onNext,
    onPrevious
}) => {
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
        return localParams.isAlwaysOpen || (localParams.startDate && localParams.endDate);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div>
                    <h2 className="text-display-sm font-semibold text-primary mb-2">
                        Configure Parameters
                    </h2>
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        Set up dates, notifications, and other parameters for your AI application form.
                    </p>
                </div>
            </div>

            {/* Form Sections */}
            <div className="space-y-8">
                {/* Date Configuration */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="light" icon={Calendar} />
                        <h3 className="text-lg font-semibold text-primary">Application Period</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Always Open Toggle */}
                        <div className="p-4 bg-gray-50 rounded-lg">
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
                                    <input
                                        type="datetime-local"
                                        value={localParams.startDate}
                                        onChange={(e) => updateTopLevel('startDate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        End Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={localParams.endDate}
                                        onChange={(e) => updateTopLevel('endDate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="warning" theme="light" icon={Bell01} />
                        <h3 className="text-lg font-semibold text-primary">Notification Settings</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Notify when application count reaches:
                            </label>
                            <input
                                type="number"
                                value={localParams.notifications.applicationCount}
                                onChange={(e) => updateLocalParams('notifications', 'applicationCount', e.target.value)}
                                placeholder="e.g. 50"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Notify when funding reaches (% of total):
                            </label>
                            <input
                                type="number"
                                value={localParams.notifications.fundingPercentage}
                                onChange={(e) => updateLocalParams('notifications', 'fundingPercentage', e.target.value)}
                                placeholder="e.g. 80"
                                max="100"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-primary">Notification Channels:</p>
                        {[
                            { key: 'emailNotifications', label: 'Email notifications', description: 'Send alerts via email' },
                            { key: 'slackNotifications', label: 'Slack notifications', description: 'Post alerts to Slack channel' },
                            { key: 'weeklyReports', label: 'Weekly summary reports', description: 'Receive weekly application summaries' }
                        ].map(item => (
                            <div key={item.key} className="p-3 bg-gray-50 rounded-lg">
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

                {/* Application Limits */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="purple" theme="light" icon={Users01} />
                        <h3 className="text-lg font-semibold text-primary">Application Limits</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Maximum total applications (optional)
                            </label>
                            <input
                                type="number"
                                value={localParams.applicationLimits.maxApplications}
                                onChange={(e) => updateLocalParams('applicationLimits', 'maxApplications', e.target.value)}
                                placeholder="Leave empty for unlimited"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Max applications per organization
                            </label>
                            <input
                                type="number"
                                value={localParams.applicationLimits.maxPerOrganization}
                                onChange={(e) => updateLocalParams('applicationLimits', 'maxPerOrganization', parseInt(e.target.value))}
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                        <Toggle
                            label="Require unique email addresses"
                            hint="Prevent duplicate applications from the same email"
                            isSelected={localParams.applicationLimits.requireUniqueEmails}
                            onChange={() => updateLocalParams('applicationLimits', 'requireUniqueEmails', !localParams.applicationLimits.requireUniqueEmails)}
                            size="sm"
                        />
                    </div>
                </div>

                {/* Customization */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
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
                                <input
                                    type="text"
                                    value={localParams.customization.brandColor}
                                    onChange={(e) => updateLocalParams('customization', 'brandColor', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">
                                Logo URL (optional)
                            </label>
                            <input
                                type="url"
                                value={localParams.customization.logoUrl}
                                onChange={(e) => updateLocalParams('customization', 'logoUrl', e.target.value)}
                                placeholder="https://yourlogo.com/logo.png"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Thank You Message
                        </label>
                        <textarea
                            value={localParams.customization.thankYouMessage}
                            onChange={(e) => updateLocalParams('customization', 'thankYouMessage', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            placeholder="Message shown to applicants after successful submission..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                            Custom Domain (optional)
                        </label>
                        <input
                            type="text"
                            value={localParams.customization.customDomain}
                            onChange={(e) => updateLocalParams('customization', 'customDomain', e.target.value)}
                            placeholder="apply.yourcompany.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        />
                        <p className="text-xs text-secondary mt-1">
                            Contact support to configure your custom domain
                        </p>
                    </div>
                </div>
            </div>

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
                        Step 5 of 5
                    </div>
                </div>
                
                <Button
                    size="lg"
                    color="primary"
                    iconTrailing={ArrowRight}
                    onClick={onNext}
                    isDisabled={!isFormValid()}
                >
                    Preview & Launch
                </Button>
            </div>

            {/* Help Text */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-800">
                    <strong>Almost there!</strong> You've configured all the essential parameters. 
                    In the next step, you'll be able to preview your AI application form and generate 
                    the embed code to make it live.
                </p>
            </div>
        </div>
    );
};