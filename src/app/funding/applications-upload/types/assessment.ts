/**
 * Assessment Types for Template-Aware Rendering
 * Supports both legacy (hardcoded) and dynamic (template-based) assessment results
 */

// Base assessment data from AI analysis
export interface BaseAssessmentResult {
  fundId: string;
  fundName: string;
  fileName: string;
  overallScore: number;
  criteriaScores: { [criterion: string]: number };
  feedback: {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  confidence: number;
  flagForReview: boolean;
  assessmentDetails: {
    completeness: number;
    alignment: number;
    innovation: number;
    feasibility: number;
  };
}

// Transparency information for V2 resilient assessments
export interface AssessmentTransparencyInfo {
  aiUsed: boolean;
  fallbackReason?: string;
  userMessage: string;
}

// Template-aware assessment response from API
export interface TemplateAssessmentResponse extends BaseAssessmentResult {
  // Template fields (present when template is available)
  formattedOutput?: any; // Dynamic template structure
  templateApplied: boolean;
  templateName?: string;
  templateError?: string;

  // V2 Resilient Assessment fields
  transparencyInfo?: AssessmentTransparencyInfo;
  strategyUsed?: {
    name: string;
    description: string;
    aiPowered: boolean;
  };

  // Legacy fields (for backwards compatibility)
  templateAvailable?: boolean;
  legacyFund?: boolean;
}

// UI-focused assessment result for display components
export interface UIAssessmentResult {
  fileName: string;
  rating: number;
  categories: string[];
  summary: string;
  status: 'processing' | 'completed' | 'error';

  // Template-aware content
  isTemplateFormatted: boolean;
  templateSections?: TemplateSection[];

  // NEW: Universal filled template content
  filledTemplate?: string;
  isFilledTemplate?: boolean;

  // V2 Resilient Assessment transparency
  transparencyInfo?: AssessmentTransparencyInfo;
  strategyUsed?: {
    name: string;
    description: string;
    aiPowered: boolean;
  };

  // Legacy content (fallback)
  details?: LegacyAssessmentDetails;
  recommendations: string[];
}

// Dynamic template section structure
export interface TemplateSection {
  name: string;
  content: any; // Dynamic content based on template
  type: 'scores' | 'text' | 'recommendations' | 'metadata' | 'mixed';
}

// Legacy hardcoded assessment structure (backwards compatibility)
export interface LegacyAssessmentDetails {
  eligibility: {
    score: number;
    notes: string;
  };
  impact: {
    score: number;
    notes: string;
  };
  feasibility: {
    score: number;
    notes: string;
  };
  innovation: {
    score: number;
    notes: string;
  };
}

// Helper function to determine if response has template formatting
export function hasTemplateFormatting(response: TemplateAssessmentResponse): boolean {
  return response.templateApplied && !!response.formattedOutput;
}

// Helper function to convert API response to UI format
export function convertToUIResult(
  file: File,
  apiResponse: TemplateAssessmentResponse,
  fund: any
): UIAssessmentResult {
  const isTemplateFormatted = hasTemplateFormatting(apiResponse);

  // NEW: Check if this is a filled template format - support string template output
  const isFilledTemplate = (typeof apiResponse.formattedOutput === 'string') ||
                           apiResponse.formattedOutput?.templateFormat === 'raw_filled';

  // Fix score extraction - check multiple possible locations for the score
  const extractedScore = (apiResponse as any).score ||
                        apiResponse.overallScore ||
                        apiResponse.extractedFields?.overallScore ||
                        0;

  return {
    fileName: file.name,
    rating: extractedScore,
    categories: [fund.name || 'Unknown Fund', "Completeness", "Alignment", "Innovation", "Feasibility"],
    summary: generateSummaryFromFeedback(apiResponse, fund),
    status: 'completed',
    isTemplateFormatted,
    templateSections: isTemplateFormatted && !isFilledTemplate ? parseTemplateSections(apiResponse.formattedOutput) : undefined,

    // NEW: Universal filled template content - handle string output
    filledTemplate: isFilledTemplate ?
      (typeof apiResponse.formattedOutput === 'string' ?
        apiResponse.formattedOutput :
        apiResponse.formattedOutput?.filledTemplate) :
      undefined,
    isFilledTemplate,

    details: !isTemplateFormatted ? createLegacyDetails(apiResponse) : undefined,
    recommendations: apiResponse.feedback?.suggestions || [],

    // Add transparency info if available
    transparencyInfo: apiResponse.transparencyInfo,
    strategyUsed: apiResponse.strategyUsed,
  };
}

// Parse template output into structured sections
function parseTemplateSections(formattedOutput: any): TemplateSection[] {
  if (!formattedOutput || typeof formattedOutput !== 'object') {
    return [];
  }

  const sections: TemplateSection[] = [];

  // Skip metadata section for UI display
  Object.entries(formattedOutput).forEach(([key, value]) => {
    if (key === 'metadata' || key === 'templateApplied' || key === 'templateName') {
      return;
    }

    const sectionType = determineSectionType(key, value);
    sections.push({
      name: formatSectionName(key),
      content: value,
      type: sectionType
    });
  });

  return sections;
}

// Determine the type of content in a template section
function determineSectionType(key: string, content: any): TemplateSection['type'] {
  const keyLower = key.toLowerCase();

  if (keyLower.includes('score') || keyLower.includes('assessment') || keyLower.includes('evaluation')) {
    return 'scores';
  }
  if (keyLower.includes('recommendation') || keyLower.includes('suggestion') || keyLower.includes('action')) {
    return 'recommendations';
  }
  if (keyLower.includes('detail') || keyLower.includes('summary') || keyLower.includes('overview')) {
    return 'metadata';
  }
  if (typeof content === 'object' && content !== null) {
    return 'mixed';
  }
  return 'text';
}

// Format section names for display
function formatSectionName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Create legacy assessment details (backwards compatibility)
function createLegacyDetails(assessment: BaseAssessmentResult): LegacyAssessmentDetails {
  // Fix score extraction - check multiple possible locations
  const baseScore = (assessment as any).score ||
                   assessment.overallScore ||
                   assessment.extractedFields?.overallScore ||
                   0;

  return {
    eligibility: {
      score: assessment.assessmentDetails?.completeness || baseScore,
      notes: assessment.feedback?.strengths?.[0] || 'Assessment completed successfully'
    },
    impact: {
      score: assessment.assessmentDetails?.alignment || baseScore,
      notes: assessment.feedback?.strengths?.[1] || 'Impact evaluation completed'
    },
    feasibility: {
      score: assessment.assessmentDetails?.feasibility || baseScore,
      notes: assessment.feedback?.weaknesses?.[0] || 'Feasibility assessment completed'
    },
    innovation: {
      score: assessment.assessmentDetails?.innovation || baseScore,
      notes: assessment.feedback?.suggestions?.[0] || 'Innovation potential evaluated'
    }
  };
}

// Generate summary from assessment feedback
function generateSummaryFromFeedback(assessment: BaseAssessmentResult, fund: any): string {
  // Fix score extraction - check multiple possible locations
  const score = (assessment as any).score ||
                assessment.overallScore ||
                assessment.extractedFields?.overallScore ||
                0;
  const fundName = assessment.fundName || fund?.name || 'the fund';

  if (score >= 80) {
    return `Excellent application with strong alignment to ${fundName} objectives. ${assessment.feedback?.strengths?.[0] || 'Demonstrates high potential for success.'}`;
  } else if (score >= 70) {
    return `Good application that meets ${fundName} requirements with some areas for improvement. ${assessment.feedback?.strengths?.[0] || 'Shows solid potential.'}`;
  } else if (score >= 60) {
    return `Moderate application that partially aligns with ${fundName} criteria. ${assessment.feedback?.weaknesses?.[0] || 'Several areas need strengthening.'}`;
  } else {
    return `Application needs significant improvement to meet ${fundName} standards. ${assessment.feedback?.weaknesses?.[0] || 'Major revisions recommended.'}`;
  }
}