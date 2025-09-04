"use client";

import { CheckCircle, File02, TrendUp02, AlertTriangle } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { AssessmentResult } from "./assessment-processor";

interface AssessmentResultsProps {
    results: AssessmentResult[];
    onSubmit: () => void;
    onBackToUpload: () => void;
}

export const AssessmentResults = ({ results, onSubmit, onBackToUpload }: AssessmentResultsProps) => {
    const averageRating = Math.round(results.reduce((sum, result) => sum + result.rating, 0) / results.length);
    const successfulAssessments = results.filter(r => r.status === 'completed').length;

    return (
        <div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Assessment Complete</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {successfulAssessments} of {results.length} application{results.length > 1 ? 's' : ''} processed successfully
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-semibold text-brand-600">{averageRating}</div>
                        <div className="text-sm text-gray-500">Average Score</div>
                    </div>
                </div>
            </div>

            {/* Individual Results */}
            <div className="space-y-4">
                {results.map((result, index) => (
                    <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h4 className="text-md font-medium text-gray-900 mb-2">{result.fileName}</h4>
                                <div className="flex items-center gap-2 mb-3">
                                    <BadgeWithDot
                                        size="sm"
                                        type="pill-color"
                                        color="success"
                                        className="capitalize"
                                    >
                                        New to R&D Grant
                                    </BadgeWithDot>
                                    {result.categories.slice(1, 3).map((category, i) => (
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
                                <div className="text-xl font-semibold text-brand-600">{result.rating}</div>
                                <div className="text-sm text-gray-500">Score</div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mb-4">
                            <p className="text-sm text-gray-700">{result.summary}</p>
                        </div>

                        {/* Detailed Scores */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-700">Eligibility</span>
                                    <span className="text-sm text-gray-600">{result.details.eligibility.score}</span>
                                </div>
                                <ProgressBar 
                                    value={result.details.eligibility.score} 
                                    max={100} 
                                    className="mb-1"
                                />
                                <p className="text-xs text-gray-500">{result.details.eligibility.notes}</p>
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-700">Impact</span>
                                    <span className="text-sm text-gray-600">{result.details.impact.score}</span>
                                </div>
                                <ProgressBar 
                                    value={result.details.impact.score} 
                                    max={100} 
                                    className="mb-1"
                                />
                                <p className="text-xs text-gray-500">{result.details.impact.notes}</p>
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-700">Feasibility</span>
                                    <span className="text-sm text-gray-600">{result.details.feasibility.score}</span>
                                </div>
                                <ProgressBar 
                                    value={result.details.feasibility.score} 
                                    max={100} 
                                    className="mb-1"
                                />
                                <p className="text-xs text-gray-500">{result.details.feasibility.notes}</p>
                            </div>
                            
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-700">Innovation</span>
                                    <span className="text-sm text-gray-600">{result.details.innovation.score}</span>
                                </div>
                                <ProgressBar 
                                    value={result.details.innovation.score} 
                                    max={100} 
                                    className="mb-1"
                                />
                                <p className="text-xs text-gray-500">{result.details.innovation.notes}</p>
                            </div>
                        </div>

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
                    Upload More Applications
                </Button>
                <Button
                    color="primary"
                    onClick={onSubmit}
                    iconLeading={CheckCircle}
                >
                    Submit to Database
                </Button>
            </div>
        </div>
    );
};