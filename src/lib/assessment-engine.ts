/**
 * Assessment Engine - Core AI-Powered Application Assessment
 *
 * This engine performs the actual assessment of applications using focused Claude prompts.
 * It provides full transparency about what AI did vs didn't work.
 */

import { claudeService, ClaudeService, ClaudeRequest } from './claude-service';
import { fieldExtractor, ExtractedApplicationData, FieldExtractionStatus } from './field-extractor';

export interface AssessmentCriteria {
  name: string;
  description: string;
  weight: number;
  keyIndicators: string[];
}

export interface FundBrain {
  fundName: string;
  criteria: AssessmentCriteria[];
  successPatterns: {
    averageScore: number;
    commonStrengths: string[];
    keyIndicators: string[];
  };
  assessmentInstructions: string;
}

export interface AssessmentResult {
  // Core assessment data
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

  // Assessment details
  assessmentDetails: {
    completeness: number;
    alignment: number;
    innovation: number;
    feasibility: number;
  };

  // Extracted field data
  extractedFields: ExtractedApplicationData;

  // Transparency information
  aiStatus: {
    assessmentUsedAI: boolean;
    fieldExtractionUsedAI: boolean;
    failedAITasks: string[];
    successfulAITasks: string[];
  };
}

export interface AssessmentStatus {
  success: boolean;
  result?: AssessmentResult;
  error?: string;
  warnings: string[];
}

export class AssessmentEngine {

  /**
   * Perform complete assessment of an application
   */
  async assessApplication(
    documentContent: string,
    fileName: string,
    fundBrain: FundBrain,
    fundId: string,
    templatePlaceholders: string[] = []
  ): Promise<AssessmentStatus> {

    console.log(`🧠 Starting comprehensive assessment: ${fileName}`);
    console.log(`📋 Fund: ${fundBrain.fundName}`);
    console.log(`📏 Criteria: ${fundBrain.criteria.length}`);

    const warnings: string[] = [];
    const aiTasks = {
      successful: [] as string[],
      failed: [] as string[],
    };

    try {
      // Stage 1: Extract fields from application
      console.log('📊 Stage 1: Extracting application fields...');
      const fieldExtractionResult = await fieldExtractor.extractFields(
        documentContent,
        templatePlaceholders
      );

      if (fieldExtractionResult.aiUsed) {
        aiTasks.successful.push('field_extraction');
      }

      if (fieldExtractionResult.failedExtractions.length > 0) {
        warnings.push(`Failed to extract ${fieldExtractionResult.failedExtractions.length} fields: ${fieldExtractionResult.failedExtractions.join(', ')}`);
      }

      // Stage 2: Perform AI assessment
      console.log('🎯 Stage 2: Performing AI assessment...');
      const assessmentResult = await this.performAIAssessment(
        documentContent,
        fundBrain
      );

      if (assessmentResult.success) {
        aiTasks.successful.push('ai_assessment');
      } else {
        aiTasks.failed.push('ai_assessment');

        // Fall back to basic assessment
        console.warn('⚠️ AI assessment failed, using fallback assessment');
        warnings.push('AI assessment failed, using simplified scoring');

        const fallbackAssessment = this.createFallbackAssessment(
          documentContent,
          fundBrain,
          fieldExtractionResult.extractedFields
        );

        return {
          success: true,
          result: {
            ...fallbackAssessment,
            fundId,
            fileName,
            extractedFields: fieldExtractionResult.extractedFields,
            aiStatus: {
              assessmentUsedAI: false,
              fieldExtractionUsedAI: fieldExtractionResult.aiUsed,
              failedAITasks: aiTasks.failed,
              successfulAITasks: aiTasks.successful,
            },
          },
          warnings,
        };
      }

      // Stage 3: Combine AI assessment with extracted fields
      console.log('🔧 Stage 3: Combining assessment with extracted data...');
      const finalResult: AssessmentResult = {
        fundId,
        fundName: fundBrain.fundName,
        fileName,
        overallScore: assessmentResult.data.overallScore,
        criteriaScores: assessmentResult.data.criteriaScores,
        feedback: assessmentResult.data.feedback,
        confidence: assessmentResult.data.confidence,
        flagForReview: assessmentResult.data.flagForReview,
        assessmentDetails: assessmentResult.data.assessmentDetails,
        extractedFields: fieldExtractionResult.extractedFields,
        aiStatus: {
          assessmentUsedAI: true,
          fieldExtractionUsedAI: fieldExtractionResult.aiUsed,
          failedAITasks: aiTasks.failed,
          successfulAITasks: aiTasks.successful,
        },
      };

      console.log(`✅ Assessment completed successfully: ${finalResult.overallScore}/100`);
      console.log(`🤖 AI used for: ${aiTasks.successful.join(', ')}`);
      if (aiTasks.failed.length > 0) {
        console.log(`❌ AI failed for: ${aiTasks.failed.join(', ')}`);
      }

      return {
        success: true,
        result: finalResult,
        warnings,
      };

    } catch (error) {
      console.error('❌ Assessment engine failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown assessment error',
        warnings,
      };
    }
  }

  /**
   * Perform AI-powered assessment using focused prompts
   */
  private async performAIAssessment(
    documentContent: string,
    fundBrain: FundBrain
  ): Promise<{ success: boolean; data: any }> {

    // Create focused assessment tasks
    const assessmentTasks: ClaudeRequest[] = [
      {
        task: 'overall_assessment',
        prompt: this.createOverallAssessmentPrompt(documentContent, fundBrain),
        maxTokens: 2000,
        temperature: 0.3,
      },
      {
        task: 'criteria_scoring',
        prompt: this.createCriteriaAssessmentPrompt(documentContent, fundBrain),
        maxTokens: 1500,
        temperature: 0.2,
      },
      {
        task: 'feedback_generation',
        prompt: this.createFeedbackPrompt(documentContent, fundBrain),
        maxTokens: 1500,
        temperature: 0.4,
      },
    ];

    // Execute assessment tasks
    const responses = await claudeService.executeTasks(assessmentTasks);

    // Check if all critical tasks succeeded
    const overallAssessment = responses.find(r => r.task === 'overall_assessment');
    const criteriaScoring = responses.find(r => r.task === 'criteria_scoring');
    const feedbackGeneration = responses.find(r => r.task === 'feedback_generation');

    if (!overallAssessment?.success || !criteriaScoring?.success) {
      console.error('❌ Critical assessment tasks failed');
      return { success: false, data: {} };
    }

    try {
      // Parse assessment results
      const overallData = this.parseAssessmentResponse(overallAssessment.content);
      const criteriaData = this.parseAssessmentResponse(criteriaScoring.content);
      const feedbackData = feedbackGeneration?.success
        ? this.parseAssessmentResponse(feedbackGeneration.content)
        : { feedback: { strengths: [], weaknesses: [], suggestions: [] } };

      // Combine all assessment data
      const combinedAssessment = {
        overallScore: overallData.overallScore || 75,
        criteriaScores: criteriaData.criteriaScores || {},
        feedback: feedbackData.feedback || { strengths: [], weaknesses: [], suggestions: [] },
        confidence: overallData.confidence || 0.8,
        flagForReview: overallData.flagForReview || false,
        assessmentDetails: {
          completeness: criteriaData.criteriaScores?.completeness || overallData.overallScore || 75,
          alignment: criteriaData.criteriaScores?.alignment || overallData.overallScore || 75,
          innovation: criteriaData.criteriaScores?.innovation || overallData.overallScore || 75,
          feasibility: criteriaData.criteriaScores?.feasibility || overallData.overallScore || 75,
        },
      };

      return { success: true, data: combinedAssessment };

    } catch (error) {
      console.error('❌ Failed to parse assessment responses:', error);
      return { success: false, data: {} };
    }
  }

  /**
   * Create prompt for overall assessment
   */
  private createOverallAssessmentPrompt(documentContent: string, fundBrain: FundBrain): string {
    return ClaudeService.createFocusedPrompt(
      'Overall Application Assessment',
      documentContent,
      `
        Assess this application against the ${fundBrain.fundName} fund.

        Fund Assessment Instructions:
        ${fundBrain.assessmentInstructions}

        Success Patterns (what good applications typically have):
        - Average successful score: ${fundBrain.successPatterns.averageScore}/100
        - Common strengths: ${fundBrain.successPatterns.commonStrengths.join(', ')}
        - Key indicators: ${fundBrain.successPatterns.keyIndicators.join(', ')}

        Provide a comprehensive assessment focusing on overall quality and alignment.
      `,
      `
        Respond with valid JSON only:
        {
          "overallScore": number (0-100),
          "confidence": number (0.0-1.0),
          "flagForReview": boolean,
          "reasoning": "Brief explanation of the score"
        }
      `
    );
  }

  /**
   * Create prompt for criteria-specific assessment
   */
  private createCriteriaAssessmentPrompt(documentContent: string, fundBrain: FundBrain): string {
    const criteriaDetails = fundBrain.criteria.map(c =>
      `- ${c.name} (weight: ${c.weight}): ${c.description}\n  Key indicators: ${c.keyIndicators.join(', ')}`
    ).join('\n');

    return ClaudeService.createFocusedPrompt(
      'Criteria-Based Scoring',
      documentContent,
      `
        Score this application against each specific criterion:

        ${criteriaDetails}

        For each criterion, provide a score from 0-100 based on evidence in the application.
        Be specific about what evidence supports each score.
      `,
      `
        Respond with valid JSON only:
        {
          "criteriaScores": {
            "completeness": number (0-100),
            "alignment": number (0-100),
            "innovation": number (0-100),
            "feasibility": number (0-100)
          },
          "evidence": {
            "completeness": "Specific evidence from application",
            "alignment": "Specific evidence from application",
            "innovation": "Specific evidence from application",
            "feasibility": "Specific evidence from application"
          }
        }
      `
    );
  }

  /**
   * Create prompt for feedback generation
   */
  private createFeedbackPrompt(documentContent: string, fundBrain: FundBrain): string {
    return ClaudeService.createFocusedPrompt(
      'Assessment Feedback Generation',
      documentContent,
      `
        Generate constructive feedback for this ${fundBrain.fundName} application.
        Focus on specific, actionable feedback that will help improve the application.

        Identify:
        1. Key strengths (what they did well)
        2. Areas for improvement (what could be better)
        3. Specific suggestions (actionable recommendations)
      `,
      `
        Respond with valid JSON only:
        {
          "feedback": {
            "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
            "weaknesses": ["specific weakness 1", "specific weakness 2"],
            "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"]
          }
        }
      `
    );
  }

  /**
   * Parse Claude's assessment response
   */
  private parseAssessmentResponse(content: string): any {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in assessment response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('❌ Failed to parse assessment response:', error);
      throw error;
    }
  }

  /**
   * Create fallback assessment when AI fails
   */
  private createFallbackAssessment(
    documentContent: string,
    fundBrain: FundBrain,
    extractedFields: ExtractedApplicationData
  ): Omit<AssessmentResult, 'fundId' | 'fileName' | 'extractedFields' | 'aiStatus'> {

    // Simple scoring based on document completeness and extracted fields
    const docLength = documentContent.length;
    const hasOrgName = !!extractedFields.organisationName;
    const hasFunding = !!extractedFields.totalFundingRequested;
    const hasContact = !!extractedFields.contactEmail;

    // Calculate fallback score
    let score = 50; // Base score
    if (docLength > 1000) score += 15; // Substantial content
    if (hasOrgName) score += 10; // Organization identified
    if (hasFunding) score += 10; // Funding amount specified
    if (hasContact) score += 10; // Contact information provided
    if (docLength > 2000) score += 5; // Comprehensive application

    return {
      fundName: fundBrain.fundName,
      overallScore: Math.min(score, 100),
      criteriaScores: {
        completeness: hasOrgName && hasFunding ? 80 : 60,
        alignment: 70, // Default neutral score
        innovation: 65, // Default neutral score
        feasibility: hasOrgName && hasFunding ? 75 : 60,
      },
      feedback: {
        strengths: [
          hasOrgName ? 'Clear organization identification' : 'Application submitted',
          docLength > 1000 ? 'Comprehensive application content' : 'Application content provided'
        ].filter(Boolean),
        weaknesses: [
          !hasOrgName ? 'Organization name not clearly identified' : null,
          !hasFunding ? 'Funding amount not specified' : null,
          !hasContact ? 'Contact information missing' : null,
          docLength < 1000 ? 'Application could be more detailed' : null
        ].filter(Boolean) as string[],
        suggestions: [
          'Manual review recommended due to AI assessment failure',
          'Verify all required information is present',
          'Consider requesting additional details from applicant'
        ]
      },
      confidence: 0.5, // Low confidence for fallback assessment
      flagForReview: true, // Always flag fallback assessments for review
      assessmentDetails: {
        completeness: hasOrgName && hasFunding ? 80 : 60,
        alignment: 70,
        innovation: 65,
        feasibility: hasOrgName && hasFunding ? 75 : 60,
      },
    };
  }
}

// Export singleton instance
export const assessmentEngine = new AssessmentEngine();