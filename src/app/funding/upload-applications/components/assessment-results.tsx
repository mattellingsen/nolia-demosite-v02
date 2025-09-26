"use client";

import { CheckCircle, File02, TrendUp02, AlertTriangle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { UIAssessmentResult, TemplateSection } from "../types/assessment";

interface AssessmentResultsProps {
    results: UIAssessmentResult[];
    onSubmit: () => void;
    onBackToUpload: () => void;
    isSubmitting?: boolean;
}

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

export const AssessmentResults = ({ results, onSubmit, onBackToUpload, isSubmitting = false }: AssessmentResultsProps) => {
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
            {/* Summary Header */}
            <div className={`bg-white rounded-xl border p-6 ${hasAnyErrors ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className={`text-lg font-semibold ${hasAnyErrors ? 'text-amber-900' : 'text-gray-900'}`}>
                            Assessment {hasAnyErrors && failedAssessments < results.length ? 'Partially' : ''} Complete
                        </h3>
                        <p className={`mt-1 text-sm ${hasAnyErrors ? 'text-amber-700' : 'text-gray-500'}`}>
                            {successfulAssessments} of {results.length} application{results.length > 1 ? 's' : ''} processed successfully
                            {failedAssessments > 0 && (
                                <span className="block text-amber-600 font-medium">
                                    {failedAssessments} assessment{failedAssessments > 1 ? 's' : ''} failed
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className={`text-2xl font-semibold ${hasAnyErrors && successfulAssessments === 0 ? 'text-amber-600' : 'text-brand-600'}`}>
                            {successfulAssessments === 0 ? 'N/A' : averageRating}
                        </div>
                        <div className="text-sm text-gray-500">Average Score</div>
                    </div>
                </div>
                {hasAnyErrors && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-amber-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-800">
                            {failedAssessments === results.length
                                ? 'All assessments failed. Please check your fund brain configuration and try again.'
                                : 'Some assessments failed. Review the errors below and consider re-uploading affected documents.'
                            }
                        </p>
                    </div>
                )}
            </div>

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
                                <div className="flex items-center gap-2 mb-3">
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
                                    {result.status !== 'error' && result.categories.slice(1, 3).map((category, i) => (
                                        <Badge
                                            key={i}
                                            size="sm"
                                            type="pill-color"
                                            color={i === 0 ? "blue" : "indigo"}
                                        >
                                            {category}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xl font-semibold ${
                                    result.status === 'error'
                                        ? 'text-red-600'
                                        : 'text-brand-600'
                                }`}>
                                    {result.status === 'error'
                                        ? 'Failed'
                                        : (typeof result.rating === 'number' && !isNaN(result.rating) ? result.rating : 'N/A')
                                    }
                                </div>
                                <div className="text-sm text-gray-500">
                                    {result.status === 'error' ? 'Status' : 'Score'}
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mb-4">
                            <p className="text-sm text-gray-700">{result.summary}</p>
                        </div>

                        {/* Dynamic Assessment Content */}
                        {result.status !== 'error' && (
                            <div className="mb-4">
                                {result.isFilledTemplate && result.filledTemplate ? (
                                    // NEW: Render universal filled template (preserves exact format)
                                    <div className="bg-gray-50 rounded-lg p-4 border">
                                        <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                            <File02 className="w-4 h-4 text-blue-500" />
                                            Output Template (Filled)
                                        </h5>
                                        <div className="bg-white rounded border p-4">
                                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                                                {result.filledTemplate}
                                            </pre>
                                        </div>
                                    </div>
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
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <Button
                    color="secondary"
                    onClick={onBackToUpload}
                >
                    {hasAnyErrors ? 'Try Again' : 'Upload More Applications'}
                </Button>
                <Button
                    color="primary"
                    onClick={onSubmit}
                    iconLeading={CheckCircle}
                    disabled={successfulAssessments === 0 || isSubmitting}
                    loading={isSubmitting}
                >
                    {isSubmitting
                        ? `Saving ${successfulAssessments} Assessment${successfulAssessments > 1 ? 's' : ''}...`
                        : successfulAssessments === 0
                            ? 'No Results to Submit'
                            : `Submit ${successfulAssessments} Assessment${successfulAssessments > 1 ? 's' : ''}`
                    }
                </Button>
            </div>
        </div>
    );
};