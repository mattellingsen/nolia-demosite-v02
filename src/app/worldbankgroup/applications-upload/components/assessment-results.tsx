"use client";

import { useState, useEffect } from "react";
import { CheckCircle, File02, TrendUp02, AlertTriangle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { UIAssessmentResult, TemplateSection } from "../types/assessment";

interface AssessmentResultsProps {
    results: UIAssessmentResult[];
    onSubmit: () => void;
    onBackToUpload: () => void;
}

// Custom hook for typewriter effect
const useTypewriter = (text: string, speed: number = 15) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!text) {
            setIsComplete(true);
            return;
        }

        let currentIndex = 0;
        setDisplayedText('');
        setIsComplete(false);

        const timer = setInterval(() => {
            if (currentIndex < text.length) {
                setDisplayedText(text.substring(0, currentIndex + 1));
                currentIndex++;
            } else {
                setIsComplete(true);
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return { displayedText, isComplete };
};

// Component to render filled template with typewriter effect
const TypewriterTemplate = ({ template }: { template: string }) => {
    const { displayedText, isComplete } = useTypewriter(template, 8);

    return (
        <div className="space-y-3">
            {displayedText.split('\n').map((line, idx) => {
                // Single # = Display medium bold
                if (line.startsWith('# ')) {
                    return <h1 key={idx} className="font-display text-display-md font-bold text-gray-900">{line.substring(2)}</h1>;
                }
                // Double ## = Text XL Bold
                if (line.startsWith('## ')) {
                    return <h2 key={idx} className="font-sans text-xl font-bold text-gray-900">{line.substring(3)}</h2>;
                }
                // Double ** = Text small bold (anywhere in line)
                if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                        <p key={idx} className="font-sans text-sm text-gray-700">
                            {parts.map((part, i) =>
                                i % 2 === 1 ? <strong key={i} className="font-bold">{part}</strong> : part
                            )}
                        </p>
                    );
                }
                // Regular text
                if (line.trim()) {
                    return <p key={idx} className="font-sans text-sm text-gray-700">{line}</p>;
                }
                // Empty line
                return <div key={idx} className="h-2" />;
            })}
            {!isComplete && <span className="inline-block w-1 h-4 bg-brand-600 animate-pulse ml-1" />}
        </div>
    );
};

// Component to render a single template section
const TemplateSectionRenderer = ({ section }: { section: TemplateSection }) => {
    const renderSectionContent = () => {
        switch (section.type) {
            case 'scores':
                return renderScoresSection(section);
            case 'text':
                return renderTextSection(section);
            case 'recommendations':
                return renderRecommendationsSection(section);
            case 'metadata':
                return renderMetadataSection(section);
            case 'mixed':
                return renderMixedSection(section);
            default:
                return renderGenericSection(section);
        }
    };

    return (
        <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{section.name}</h4>
            {renderSectionContent()}
        </div>
    );
};

// Render scores-type sections with progress bars
const renderScoresSection = (section: TemplateSection) => {
    const content = section.content;

    if (typeof content !== 'object' || !content) {
        return <p className="text-sm text-gray-600">No score data available</p>;
    }

    const scoreEntries = Object.entries(content).filter(([key, value]) =>
        typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))
    );

    if (scoreEntries.length === 0) {
        return <p className="text-sm text-gray-600">{JSON.stringify(content)}</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scoreEntries.map(([key, value]) => {
                const score = typeof value === 'number' ? value : Number(value);
                const displayName = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
                    .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                return (
                    <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">{displayName}</span>
                            <span className="text-sm text-gray-600">{score}</span>
                        </div>
                        <ProgressBar
                            value={score}
                            max={100}
                            className="mb-1"
                        />
                    </div>
                );
            })}
        </div>
    );
};

// Render text-type sections
const renderTextSection = (section: TemplateSection) => {
    const content = section.content;
    if (typeof content === 'string') {
        return <p className="text-sm text-gray-600">{content}</p>;
    }
    return <p className="text-sm text-gray-600">{JSON.stringify(content)}</p>;
};

// Render recommendations-type sections
const renderRecommendationsSection = (section: TemplateSection) => {
    const content = section.content;
    if (Array.isArray(content)) {
        return (
            <ul className="space-y-1">
                {content.map((item, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        );
    }
    return <p className="text-sm text-gray-600">{JSON.stringify(content)}</p>;
};

// Render metadata-type sections
const renderMetadataSection = (section: TemplateSection) => {
    const content = section.content;
    if (typeof content === 'object' && content) {
        return (
            <div className="space-y-2">
                {Object.entries(content).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">
                            {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
                                .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:
                        </span>
                        <span className="text-sm text-gray-600">{String(value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return <p className="text-sm text-gray-600">{JSON.stringify(content)}</p>;
};

// Render mixed-type sections (object with various content types)
const renderMixedSection = (section: TemplateSection) => {
    const content = section.content;
    if (typeof content === 'object' && content) {
        return (
            <div className="space-y-3">
                {Object.entries(content).map(([key, value]) => {
                    const displayKey = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()
                        .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

                    if (typeof value === 'number') {
                        return (
                            <div key={key}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-700">{displayKey}</span>
                                    <span className="text-sm text-gray-600">{value}</span>
                                </div>
                                <ProgressBar value={value} max={100} className="mb-1" />
                            </div>
                        );
                    }

                    if (Array.isArray(value)) {
                        return (
                            <div key={key}>
                                <p className="text-sm font-medium text-gray-700 mb-1">{displayKey}:</p>
                                <ul className="space-y-1 ml-4">
                                    {value.map((item, idx) => (
                                        <li key={idx} className="text-sm text-gray-600">• {item}</li>
                                    ))}
                                </ul>
                            </div>
                        );
                    }

                    return (
                        <div key={key} className="flex justify-between">
                            <span className="text-sm font-medium text-gray-700">{displayKey}:</span>
                            <span className="text-sm text-gray-600">{String(value)}</span>
                        </div>
                    );
                })}
            </div>
        );
    }
    return <p className="text-sm text-gray-600">{JSON.stringify(content)}</p>;
};

// Render generic sections (fallback)
const renderGenericSection = (section: TemplateSection) => {
    return <p className="text-sm text-gray-600">{JSON.stringify(section.content)}</p>;
};

export const AssessmentResults = ({ results, onSubmit, onBackToUpload }: AssessmentResultsProps) => {
    // Calculate average rating with proper error handling
    const validResults = results.filter(r => r.status === 'completed' && typeof r.rating === 'number' && !isNaN(r.rating));
    const averageRating = validResults.length > 0
        ? Math.round(validResults.reduce((sum, result) => sum + result.rating, 0) / validResults.length)
        : 0;
    const successfulAssessments = results.filter(r => r.status === 'completed').length;
    const failedAssessments = results.filter(r => r.status === 'error').length;
    const hasAnyErrors = failedAssessments > 0;

    return (
        <div className="space-y-6">

            {/* Individual Results */}
            <div className="space-y-4">
                {results.map((result, index) => (
                    <div
                        key={index}
                        className={`bg-white rounded-xl border p-6 ${
                            result.status === 'error'
                                ? 'border-red-200 bg-red-50'
                                : 'border-gray-200'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h4 className="text-md font-medium text-gray-900 mb-2">{result.fileName}</h4>
                            </div>
                            <div>
                                {result.status === 'error' ? (
                                    <BadgeWithDot
                                        size="sm"
                                        type="pill-color"
                                        color="error"
                                        className="capitalize"
                                    >
                                        Assessment Failed
                                    </BadgeWithDot>
                                ) : (
                                    <BadgeWithDot
                                        size="sm"
                                        type="pill-color"
                                        color="success"
                                        className="capitalize"
                                    >
                                        Assessment Complete
                                    </BadgeWithDot>
                                )}
                            </div>
                        </div>

                        {/* V2 Transparency Information */}
                        {result.transparencyInfo && (
                            <div className="mb-4 p-3 rounded-lg border bg-blue-50 border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    {result.transparencyInfo.aiUsed ? (
                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                            🤖 AI-Powered Assessment
                                        </span>
                                    ) : (
                                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
                                            📋 Pattern-Based Assessment
                                        </span>
                                    )}
                                    {result.strategyUsed && (
                                        <span className="text-xs text-blue-700 font-medium">
                                            {result.strategyUsed.name}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-blue-800">
                                    {result.transparencyInfo.userMessage}
                                </p>
                                {result.transparencyInfo.fallbackReason && (
                                    <p className="text-xs text-blue-600 mt-1 italic">
                                        Fallback reason: {result.transparencyInfo.fallbackReason}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Dynamic Assessment Content */}
                        {result.status !== 'error' && (
                            <div className="mb-4">
                                {result.isFilledTemplate && result.filledTemplate ? (
                                    // NEW: Render universal filled template with typewriter effect
                                    <TypewriterTemplate template={result.filledTemplate} />
                                ) : result.isTemplateFormatted && result.templateSections ? (
                                    // Render dynamic template sections (legacy structured format)
                                    <div className="space-y-4">
                                        {result.templateSections.map((section, index) => (
                                            <TemplateSectionRenderer
                                                key={index}
                                                section={section}
                                            />
                                        ))}
                                    </div>
                                ) : result.details ? (
                                    // Render legacy format for backwards compatibility
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700">Eligibility</span>
                                                <span className="text-sm text-gray-600">
                                                    {typeof result.details.eligibility.score === 'number' && !isNaN(result.details.eligibility.score)
                                                        ? result.details.eligibility.score
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                            <ProgressBar
                                                value={typeof result.details.eligibility.score === 'number' && !isNaN(result.details.eligibility.score)
                                                    ? result.details.eligibility.score
                                                    : 0}
                                                max={100}
                                                className="mb-1"
                                            />
                                            <p className="text-xs text-gray-500">{result.details.eligibility.notes || 'No notes available'}</p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700">Impact</span>
                                                <span className="text-sm text-gray-600">
                                                    {typeof result.details.impact.score === 'number' && !isNaN(result.details.impact.score)
                                                        ? result.details.impact.score
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                            <ProgressBar
                                                value={typeof result.details.impact.score === 'number' && !isNaN(result.details.impact.score)
                                                    ? result.details.impact.score
                                                    : 0}
                                                max={100}
                                                className="mb-1"
                                            />
                                            <p className="text-xs text-gray-500">{result.details.impact.notes || 'No notes available'}</p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700">Feasibility</span>
                                                <span className="text-sm text-gray-600">
                                                    {typeof result.details.feasibility.score === 'number' && !isNaN(result.details.feasibility.score)
                                                        ? result.details.feasibility.score
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                            <ProgressBar
                                                value={typeof result.details.feasibility.score === 'number' && !isNaN(result.details.feasibility.score)
                                                    ? result.details.feasibility.score
                                                    : 0}
                                                max={100}
                                                className="mb-1"
                                            />
                                            <p className="text-xs text-gray-500">{result.details.feasibility.notes || 'No notes available'}</p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-gray-700">Innovation</span>
                                                <span className="text-sm text-gray-600">
                                                    {typeof result.details.innovation.score === 'number' && !isNaN(result.details.innovation.score)
                                                        ? result.details.innovation.score
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                            <ProgressBar
                                                value={typeof result.details.innovation.score === 'number' && !isNaN(result.details.innovation.score)
                                                    ? result.details.innovation.score
                                                    : 0}
                                                max={100}
                                                className="mb-1"
                                            />
                                            <p className="text-xs text-gray-500">{result.details.innovation.notes || 'No notes available'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No assessment details available</p>
                                )}
                            </div>
                        )}

                        {/* Recommendations */}
                        {result.recommendations && result.recommendations.length > 0 && (
                            <div className="border-t border-gray-200 pt-4">
                                <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Recommendations
                                </h5>
                                <ul className="space-y-1">
                                    {result.recommendations.map((rec, i) => (
                                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                            <span className="text-amber-500 mt-1">•</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end pt-6 border-t border-gray-200">
                <Button
                    color="primary"
                    onClick={onSubmit}
                    iconLeading={CheckCircle}
                    disabled={successfulAssessments === 0}
                >
                    {successfulAssessments === 0
                        ? 'No Results to Submit'
                        : `Submit ${successfulAssessments} Assessment${successfulAssessments > 1 ? 's' : ''}`
                    }
                </Button>
            </div>
        </div>
    );
};