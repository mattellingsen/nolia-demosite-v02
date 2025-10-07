"use client";

import { useState, useEffect } from "react";
import { Stars01, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Lightbulb01, TrendUp02, Settings01, RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

interface AIRecommendationsProps {
    formData: any;
    updateFormData?: (updates: any) => void;
    onClose?: () => void;
}

interface AISuggestion {
    id: string;
    category: 'scoring' | 'structure' | 'validation' | 'optimization';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    currentValue?: string;
    suggestedValue?: string;
    reasoning: string;
    accepted: boolean;
}

interface AnalysisData {
    overallScore: number;
    suggestions: AISuggestion[];
    strengths: string[];
    improvements: string[];
    processingTime?: number;
}

export const AIRecommendations: React.FC<AIRecommendationsProps> = ({
    formData,
    updateFormData,
    onClose
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
    const [error, setError] = useState<string>('');

    const generateSuggestions = async () => {
        setIsAnalyzing(true);
        setError('');

        try {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate AI processing

            // Mock AI suggestions based on uploaded data
            const mockSuggestions: AISuggestion[] = [
                {
                    id: '1',
                    category: 'scoring',
                    title: 'Optimize Scoring Weights',
                    description: 'Based on your selection criteria, the current weighting might not effectively differentiate between submissions.',
                    impact: 'high',
                    currentValue: 'Innovation: 30%, Financial: 25%, Team: 20%',
                    suggestedValue: 'Innovation: 35%, Financial: 20%, Team: 25%',
                    reasoning: 'Your good examples show that innovative projects with strong teams tend to succeed more than purely financially focused ones.',
                    accepted: false
                },
                {
                    id: '2',
                    category: 'structure',
                    title: 'Add Validation Questions',
                    description: 'Include pre-qualification questions to filter out ineligible submissions early.',
                    impact: 'medium',
                    suggestedValue: 'Add 3-4 yes/no eligibility questions at the start',
                    reasoning: 'This will reduce processing time for submissions that don\'t meet basic criteria.',
                    accepted: false
                },
                {
                    id: '3',
                    category: 'validation',
                    title: 'Implement Smart Word Limits',
                    description: 'Set dynamic word limits based on question complexity to improve response quality.',
                    impact: 'medium',
                    currentValue: 'Fixed 500 words per question',
                    suggestedValue: 'Variable: 200-800 words based on question type',
                    reasoning: 'Your examples show optimal response lengths vary significantly by question complexity.',
                    accepted: false
                },
                {
                    id: '4',
                    category: 'optimization',
                    title: 'Enable Real-time Feedback',
                    description: 'Provide instant feedback to applicants as they complete sections.',
                    impact: 'high',
                    suggestedValue: 'AI-powered completion tips and quality scores',
                    reasoning: 'This will help applicants submit higher-quality submissions, reducing your assessment workload.',
                    accepted: false
                }
            ];

            const mockAnalysis: AnalysisData = {
                overallScore: 78,
                suggestions: mockSuggestions,
                strengths: [
                    'Clear assessment criteria with defined weightings',
                    'Good examples show consistent quality standards',
                    'Comprehensive submission form structure',
                    'Well-defined scoring methodology'
                ],
                improvements: [
                    'Consider adding pre-qualification filters',
                    'Optimize scoring weights for better differentiation',
                    'Add real-time validation to improve submission quality',
                    'Include guidance text to help applicants'
                ],
                processingTime: 2800
            };

            setAnalysis(mockAnalysis);
            updateFormData({ aiSuggestions: mockAnalysis });

        } catch (error) {
            setError('Failed to generate AI suggestions. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleSuggestion = (suggestionId: string) => {
        if (!analysis) return;

        const updatedSuggestions = analysis.suggestions.map(suggestion =>
            suggestion.id === suggestionId
                ? { ...suggestion, accepted: !suggestion.accepted }
                : suggestion
        );

        const updatedAnalysis = { ...analysis, suggestions: updatedSuggestions };
        setAnalysis(updatedAnalysis);
        updateFormData({ aiSuggestions: updatedAnalysis });
    };

    const acceptAllSuggestions = () => {
        if (!analysis) return;

        const updatedSuggestions = analysis.suggestions.map(suggestion => ({
            ...suggestion,
            accepted: true
        }));

        const updatedAnalysis = { ...analysis, suggestions: updatedSuggestions };
        setAnalysis(updatedAnalysis);
        updateFormData({ aiSuggestions: updatedAnalysis });
    };

    // Auto-generate suggestions when component mounts if we have the required data
    useEffect(() => {
        if (!analysis && !isAnalyzing && formData && formData.applicationForm &&
            formData.selectionCriteria?.length > 0 && formData.goodExamples?.length > 0) {
            generateSuggestions();
        }
    }, [formData, analysis, isAnalyzing]);

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'scoring': return TrendUp02;
            case 'structure': return Settings01;
            case 'validation': return CheckCircle;
            case 'optimization': return Lightbulb01;
            default: return Stars01;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'scoring': return 'success';
            case 'structure': return 'brand';
            case 'validation': return 'warning';
            case 'optimization': return 'purple';
            default: return 'gray';
        }
    };

    const getImpactBadgeClass = (impact: string) => {
        switch (impact) {
            case 'high': return 'bg-error-50 text-error-700 border-error-200';
            case 'medium': return 'bg-warning-50 text-warning-700 border-warning-200';
            case 'low': return 'bg-gray-50 text-gray-700 border-gray-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const acceptedCount = analysis?.suggestions.filter(s => s.accepted).length || 0;
    const totalCount = analysis?.suggestions.length || 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <div>
                    <h2 className="text-display-sm font-semibold text-primary mb-2">
                        AI Analysis & Suggestions
                    </h2>
                    <p className="text-lg text-secondary max-w-2xl mx-auto">
                        Our AI has analyzed your form, criteria, and examples to provide recommendations
                        for optimizing your submission process.
                    </p>
                </div>
            </div>

            {/* No Data Available */}
            {(!formData || !formData.applicationForm) && (
                <div className="text-center py-12 space-y-6">
                    <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">No Project Data Available</h3>
                        <p className="text-sm text-blue-800 mb-6">
                            To generate AI recommendations, you need to complete the project setup process first.
                            This includes uploading your submission form, selection criteria, output templates, and good examples.
                        </p>
                        <Button
                            size="lg"
                            color="primary"
                            href="/worldbank/setup/setup-new-project"
                        >
                            Set up a New Project
                        </Button>
                    </div>
                </div>
            )}

            {/* Analysis in Progress */}
            {formData && formData.applicationForm && isAnalyzing && (
                <div className="text-center py-12 space-y-6">
                    <LoadingIndicator
                        type="dot-circle"
                        size="lg"
                        label="Analyzing your submission setup..."
                    />
                    <div>
                        <p className="text-sm text-secondary">
                            This may take a few minutes as Nolia processes your forms, criteria, and examples
                        </p>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {formData && formData.applicationForm && error && (
                <div className="flex items-center gap-2 p-4 bg-error-50 border border-error-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-error-600" />
                    <p className="text-sm text-error-700">{error}</p>
                    <Button size="sm" color="tertiary" onClick={generateSuggestions} className="ml-auto">
                        Retry
                    </Button>
                </div>
            )}

            {/* Analysis Results */}
            {formData && formData.applicationForm && analysis && !isAnalyzing && (
                <div className="space-y-8">
                    {/* Overall Score & Summary */}
                    <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FeaturedIcon size="md" color="brand" theme="light" icon={CheckCircle} />
                                <h3 className="text-lg font-semibold text-primary">Analysis Complete</h3>
                            </div>
                            <Button size="sm" color="tertiary" iconLeading={RefreshCw01} onClick={generateSuggestions}>
                                Regenerate
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                                <p className={`text-3xl font-bold mb-1 ${
                                    analysis.overallScore >= 80 ? 'text-success-600' :
                                    analysis.overallScore >= 60 ? 'text-warning-600' : 'text-error-600'
                                }`}>
                                    {analysis.overallScore}%
                                </p>
                                <p className="text-sm text-secondary">Overall Score</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                                <p className="text-3xl font-bold text-brand-600 mb-1">{totalCount}</p>
                                <p className="text-sm text-secondary">Suggestions</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                                <p className="text-3xl font-bold text-success-600 mb-1">{acceptedCount}</p>
                                <p className="text-sm text-secondary">Accepted</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                                <p className="text-3xl font-bold text-purple-600 mb-1">{analysis.processingTime}ms</p>
                                <p className="text-sm text-secondary">Processing Time</p>
                            </div>
                        </div>
                    </div>

                    {/* Suggestions Header */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-primary">Recommendations</h3>
                        <div className="flex gap-2">
                            <Button size="sm" color="secondary" onClick={acceptAllSuggestions}>
                                Accept All
                            </Button>
                        </div>
                    </div>

                    {/* Suggestions List */}
                    <div className="space-y-4">
                        {analysis.suggestions.map((suggestion, index) => (
                            <div key={suggestion.id} className={`border-2 rounded-lg p-6 transition-all ${
                                suggestion.accepted
                                    ? 'border-success-200 bg-success-25'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-start gap-4">
                                        <FeaturedIcon
                                            size="md"
                                            color={getCategoryColor(suggestion.category) as any}
                                            theme="light"
                                            icon={getCategoryIcon(suggestion.category)}
                                        />
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-md font-semibold text-primary">{suggestion.title}</h4>
                                                <span className={`px-2 py-1 text-xs font-medium rounded border ${getImpactBadgeClass(suggestion.impact)}`}>
                                                    {suggestion.impact.toUpperCase()} IMPACT
                                                </span>
                                            </div>
                                            <p className="text-sm text-secondary">{suggestion.description}</p>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        color={suggestion.accepted ? "success" : "primary"}
                                        onClick={() => toggleSuggestion(suggestion.id)}
                                    >
                                        {suggestion.accepted ? 'Accepted' : 'Accept'}
                                    </Button>
                                </div>

                                {/* Current vs Suggested Values */}
                                {(suggestion.currentValue || suggestion.suggestedValue) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {suggestion.currentValue && (
                                            <div className="bg-gray-50 p-3 rounded">
                                                <p className="text-xs font-medium text-secondary mb-1">Current:</p>
                                                <p className="text-sm text-primary">{suggestion.currentValue}</p>
                                            </div>
                                        )}
                                        {suggestion.suggestedValue && (
                                            <div className="bg-brand-50 p-3 rounded">
                                                <p className="text-xs font-medium text-brand-600 mb-1">Suggested:</p>
                                                <p className="text-sm text-primary">{suggestion.suggestedValue}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Reasoning */}
                                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                    <p className="text-xs font-medium text-blue-800 mb-1">AI Reasoning:</p>
                                    <p className="text-sm text-blue-700">{suggestion.reasoning}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-success-50 rounded-lg p-6 border border-success-200">
                            <h4 className="text-md font-semibold text-success-800 mb-4">Identified Strengths</h4>
                            <div className="space-y-2">
                                {analysis.strengths.map((strength, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-success-600 mt-0.5 shrink-0" />
                                        <p className="text-sm text-success-700">{strength}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-warning-50 rounded-lg p-6 border border-warning-200">
                            <h4 className="text-md font-semibold text-warning-800 mb-4">Areas for Improvement</h4>
                            <div className="space-y-2">
                                {analysis.improvements.map((improvement, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <Lightbulb01 className="w-4 h-4 text-warning-600 mt-0.5 shrink-0" />
                                        <p className="text-sm text-warning-700">{improvement}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center items-center pt-6 border-t border-gray-200">
                {onClose && (
                    <Button
                        size="lg"
                        color="secondary"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                )}
            </div>

            {/* Progress Summary */}
            {analysis && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-800">
                        <strong>Review Complete:</strong> You've accepted {acceptedCount} out of {totalCount} suggestions.
                        These optimizations will be applied to your AI submission form in the next step.
                    </p>
                </div>
            )}
        </div>
    );
};
