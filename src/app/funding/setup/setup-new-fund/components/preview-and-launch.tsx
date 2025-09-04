"use client";

import { useState } from "react";
import { Eye, Code01, ArrowLeft, Rocket01, Copy01, LinkExternal01, Settings01, CheckCircle, Monitor04, Phone, MessageChatCircle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { ConversationalPreview } from "./conversational-preview";

interface PreviewAndLaunchProps {
    formData: any;
    onPrevious: () => void;
    onSave: () => void;
    onLaunch: () => void;
}

export const PreviewAndLaunch: React.FC<PreviewAndLaunchProps> = ({ 
    formData, 
    onPrevious,
    onSave,
    onLaunch
}) => {
    const [activeTab, setActiveTab] = useState<'conversational' | 'preview' | 'embed' | 'settings'>('conversational');
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [isLaunched, setIsLaunched] = useState(false);
    const [embedCodeCopied, setEmbedCodeCopied] = useState(false);
    
    // Generate embed code
    const embedCode = `<div id="nolia-application-form"></div>
<script src="https://embed.nolia.ai/widget.js"></script>
<script>
  new NoliaApplicationForm('nolia-application-form', {
    formId: '${generateFormId()}',
    theme: {
      primaryColor: '${formData.parameters?.customization?.brandColor || '#6366F1'}',
      logoUrl: '${formData.parameters?.customization?.logoUrl || ''}'
    },
    settings: {
      enableRealTimeFeedback: true,
      showProgressBar: true,
      autoSave: true
    }
  });
</script>`;

    const shareableUrl = `https://apply.nolia.ai/form/${generateFormId()}`;

    function generateFormId(): string {
        return 'form_' + Math.random().toString(36).substr(2, 9);
    }

    const copyEmbedCode = async () => {
        try {
            await navigator.clipboard.writeText(embedCode);
            setEmbedCodeCopied(true);
            setTimeout(() => setEmbedCodeCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy embed code');
        }
    };

    const handleLaunch = () => {
        setIsLaunched(true);
        onLaunch();
    };

    const mockFormPreview = () => (
        <div className={`bg-white rounded-lg border shadow-sm ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'}`}>
            {/* Form Header */}
            <div style={{ backgroundColor: formData.parameters?.customization?.brandColor || '#6366F1' }} className="p-6 text-white rounded-t-lg">
                {formData.parameters?.customization?.logoUrl && (
                    <img 
                        src={formData.parameters.customization.logoUrl} 
                        alt="Logo" 
                        className="h-8 mb-4"
                    />
                )}
                <h1 className="text-xl font-bold">AI Funding Application</h1>
                <p className="text-sm opacity-90">Powered by AI • Real-time feedback enabled</p>
            </div>
            
            {/* Form Content */}
            <div className="p-6 space-y-6">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                </div>
                
                {/* Mock Questions */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Organization Name *
                        </label>
                        <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Enter your organization name"
                        />
                        <p className="text-xs text-green-600 mt-1">✓ Looks good!</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Project Description *
                        </label>
                        <textarea 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={3}
                            placeholder="Describe your project in detail..."
                        ></textarea>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>AI suggests: Be more specific about your innovation</span>
                            <span>0 / 500 words</span>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Funding Amount Requested *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                            <input 
                                type="number" 
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
                
                {/* AI Assistant */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">AI</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">AI Assistant</p>
                            <p className="text-sm text-blue-800">
                                Based on successful applications, consider including specific metrics 
                                and timelines in your project description.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-between">
                    <Button size="md" color="secondary">Save Draft</Button>
                    <Button size="md" color="primary">Continue</Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div>
                    <h2 className="text-display-sm font-semibold text-primary mb-2">
                        {isLaunched ? 'AI Form Launched!' : 'Preview & Launch'}
                    </h2>
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        {isLaunched 
                            ? 'Your AI conversational form is now live and ready to guide applicants.'
                            : 'Experience your AI-powered conversational form and get the embed code to make it live.'
                        }
                    </p>
                </div>
            </div>

            {/* Success State */}
            {isLaunched && (
                <div className="bg-success-50 border border-success-200 rounded-lg p-6 text-center space-y-4">
                    <FeaturedIcon size="lg" color="success" theme="light" icon={CheckCircle} className="mx-auto" />
                    <div>
                        <h3 className="text-lg font-semibold text-success-800 mb-2">
                            Your AI Application Form is Live!
                        </h3>
                        <p className="text-success-700 mb-4">
                            Applications can now be submitted through your AI-powered form.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <Button size="md" color="success" iconLeading={LinkExternal01} href={shareableUrl} target="_blank">
                                View Live Form
                            </Button>
                            <Button size="md" color="secondary" onClick={() => setActiveTab('embed')}>
                                Get Embed Code
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex justify-center">
                <ButtonGroup 
                    defaultSelectedKeys={[activeTab]} 
                    selectionMode="single"
                    onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as 'conversational' | 'preview' | 'embed' | 'settings';
                        if (selected) setActiveTab(selected);
                    }}
                >
                    <ButtonGroupItem id="conversational" iconLeading={MessageChatCircle}>AI Chat Preview</ButtonGroupItem>
                    <ButtonGroupItem id="preview" iconLeading={Eye}>Form Preview</ButtonGroupItem>
                    <ButtonGroupItem id="embed" iconLeading={Code01}>Embed Code</ButtonGroupItem>
                    <ButtonGroupItem id="settings" iconLeading={Settings01}>Settings</ButtonGroupItem>
                </ButtonGroup>
            </div>

            {/* Tab Content */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8">
                {activeTab === 'conversational' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <FeaturedIcon size="lg" color="brand" theme="light" icon={MessageChatCircle} className="mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-primary mb-2">AI Chat Preview</h3>
                            <p className="text-secondary">Experience how applicants will interact with your AI-powered form.</p>
                        </div>

                        <ConversationalPreview 
                            formData={formData}
                            onComplete={(responses) => {
                                console.log('Preview responses:', responses);
                            }}
                        />

                        <div className="text-center text-sm text-secondary">
                            This is a preview of the conversational AI experience your applicants will have.
                        </div>
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="space-y-6">
                        {/* Device Toggle */}
                        <div className="flex justify-center">
                            <ButtonGroup 
                                defaultSelectedKeys={[previewMode]} 
                                selectionMode="single"
                                onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0] as 'desktop' | 'mobile';
                                    if (selected) setPreviewMode(selected);
                                }}
                            >
                                <ButtonGroupItem id="desktop" iconLeading={Monitor04}>Desktop</ButtonGroupItem>
                                <ButtonGroupItem id="mobile" iconLeading={Phone}>Mobile</ButtonGroupItem>
                            </ButtonGroup>
                        </div>

                        {/* Preview */}
                        <div className="min-h-96">
                            {mockFormPreview()}
                        </div>

                        <div className="text-center text-sm text-secondary">
                            This is a preview of how your AI application form will look to applicants.
                        </div>
                    </div>
                )}

                {activeTab === 'embed' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <FeaturedIcon size="lg" color="purple" theme="light" icon={Code01} className="mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-primary mb-2">Embed Your AI Form</h3>
                            <p className="text-secondary">Copy and paste this code into your website to embed the application form.</p>
                        </div>

                        {/* Embed Code */}
                        <div className="bg-gray-900 rounded-lg p-6 relative">
                            <Button
                                size="sm"
                                color={embedCodeCopied ? "success" : "secondary"}
                                iconLeading={embedCodeCopied ? CheckCircle : Copy01}
                                onClick={copyEmbedCode}
                                className="absolute top-4 right-4"
                            >
                                {embedCodeCopied ? 'Copied!' : 'Copy'}
                            </Button>
                            <pre className="text-sm text-green-400 overflow-x-auto pr-20">
                                <code>{embedCode}</code>
                            </pre>
                        </div>

                        {/* Alternative Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-primary mb-2">Direct Link</h4>
                                <p className="text-sm text-secondary mb-3">Share this URL directly with applicants</p>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={shareableUrl}
                                        readOnly
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded bg-gray-50"
                                    />
                                    <Button size="sm" color="tertiary" iconLeading={Copy01}>Copy</Button>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-lg border border-gray-200">
                                <h4 className="font-semibold text-primary mb-2">QR Code</h4>
                                <p className="text-sm text-secondary mb-3">Generate QR code for easy mobile access</p>
                                <Button size="sm" color="tertiary">Generate QR Code</Button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <FeaturedIcon size="lg" color="warning" theme="light" icon={Settings01} className="mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-primary mb-2">Form Configuration</h3>
                            <p className="text-secondary">Review and modify your form settings.</p>
                        </div>

                        {/* Settings Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h5 className="font-medium text-primary mb-3">Application Period</h5>
                                <p className="text-sm text-secondary">
                                    {formData.parameters?.isAlwaysOpen ? 
                                        'Always accepting applications' : 
                                        `${formData.parameters?.startDate || 'Not set'} - ${formData.parameters?.endDate || 'Not set'}`
                                    }
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h5 className="font-medium text-primary mb-3">Notifications</h5>
                                <p className="text-sm text-secondary">
                                    {formData.parameters?.notificationSettings?.emailNotifications ? 'Email enabled' : 'Email disabled'}<br/>
                                    {formData.parameters?.notificationSettings?.applicationCount && 
                                        `Alert at ${formData.parameters.notificationSettings.applicationCount} apps`
                                    }
                                </p>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h5 className="font-medium text-primary mb-3">Branding</h5>
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: formData.parameters?.customization?.brandColor || '#6366F1' }}
                                    ></div>
                                    <p className="text-sm text-secondary">
                                        Custom theme applied
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form Stats Preview */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <h5 className="font-medium text-primary mb-4">Expected Performance</h5>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-success-600">85%</p>
                                    <p className="text-xs text-secondary">Completion Rate</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-brand-600">3.2min</p>
                                    <p className="text-xs text-secondary">Avg. Time</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-warning-600">92%</p>
                                    <p className="text-xs text-secondary">Quality Score</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-purple-600">45%</p>
                                    <p className="text-xs text-secondary">Time Savings</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <Button
                    size="lg"
                    color="tertiary"
                    iconLeading={ArrowLeft}
                    onClick={onPrevious}
                    disabled={isLaunched}
                >
                    Previous
                </Button>
                
                <div className="flex items-center gap-4">
                    {!isLaunched && (
                        <>
                            <Button
                                size="lg"
                                color="secondary"
                                onClick={onSave}
                            >
                                Save Draft
                            </Button>
                            <Button
                                size="lg"
                                color="primary"
                                iconTrailing={Rocket01}
                                onClick={handleLaunch}
                            >
                                Launch AI Form
                            </Button>
                        </>
                    )}
                    
                    {isLaunched && (
                        <Button
                            size="lg"
                            color="success"
                            iconLeading={LinkExternal01}
                            href={shareableUrl}
                            target="_blank"
                        >
                            View Live Form
                        </Button>
                    )}
                </div>
            </div>

            {/* Final Help Text */}
            {!isLaunched && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-purple-800">
                        <strong>Ready to go live?</strong> Once launched, your AI application form will be 
                        available 24/7 to guide applicants and automatically validate submissions according 
                        to your criteria. You can always modify settings later.
                    </p>
                </div>
            )}
        </div>
    );
};