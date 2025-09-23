/**
 * Resilient Assessment Service - World-Class Engineering Implementation
 *
 * This service implements:
 * 1. Circuit Breaker Pattern with transparent fallbacks
 * 2. Two-Stage Processing (Assessment → Formatting)
 * 3. Keyword-based fallback with clear user notification
 * 4. Never trust Claude's JSON - extract through focused queries
 */

import { claudeService } from './claude-service';

export interface AssessmentStrategy {
  name: string;
  description: string;
  aiPowered: boolean;
}

export interface ResilientAssessmentResult {
  success: boolean;
  strategyUsed: AssessmentStrategy;
  assessmentData: any;
  transparencyInfo: {
    aiUsed: boolean;
    fallbackReason?: string;
    userMessage: string;
  };
  error?: string;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
}

export class ResilientAssessmentService {
  private circuitBreaker: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0
  };

  private readonly FAILURE_THRESHOLD = 3;
  private readonly RECOVERY_TIMEOUT = 60000; // 1 minute

  private strategies = {
    comprehensive: {
      name: 'Claude AI Assessment',
      description: 'Full AI-powered assessment with contextual analysis',
      aiPowered: true
    },
    fallback: {
      name: 'Pattern Matching Assessment',
      description: 'Rule-based assessment using keyword analysis',
      aiPowered: false
    }
  };

  async assess(
    applicationContent: string,
    fundBrain: any,
    fileName: string
  ): Promise<ResilientAssessmentResult> {
    console.log('🏛️ Starting resilient assessment with circuit breaker pattern');

    // Store original application content for template field extraction
    this.originalApplicationContent = applicationContent;

    // Check if we should try Claude or go straight to fallback
    if (this.shouldSkipClaude()) {
      return this.executeKeywordAssessment(applicationContent, fundBrain, fileName);
    }

    // Try Claude assessment first
    try {
      console.log('🤖 Attempting Claude AI assessment...');
      const claudeResult = await this.executeClaudeAssessment(applicationContent, fundBrain, fileName);

      if (this.validateClaudeResult(claudeResult)) {
        this.recordSuccess();
        return {
          success: true,
          strategyUsed: this.strategies.comprehensive,
          assessmentData: claudeResult,
          transparencyInfo: {
            aiUsed: true,
            userMessage: '✅ Assessment completed using advanced AI analysis'
          }
        };
      } else {
        throw new Error('Claude returned invalid assessment structure');
      }

    } catch (error) {
      console.warn('⚠️ Claude assessment failed:', error);
      this.recordFailure();

      // Fall back to keyword assessment with transparent notification
      const fallbackResult = await this.executeKeywordAssessment(applicationContent, fundBrain, fileName);

      return {
        ...fallbackResult,
        transparencyInfo: {
          aiUsed: false,
          fallbackReason: error instanceof Error ? error.message : 'Unknown error',
          userMessage: '⚠️ AI assessment unavailable. Using pattern-based analysis instead.'
        }
      };
    }
  }

  private shouldSkipClaude(): boolean {
    if (!this.circuitBreaker.isOpen) return false;

    const now = new Date();
    if (this.circuitBreaker.nextRetryTime && now < this.circuitBreaker.nextRetryTime) {
      return true;
    }

    // Time to try again
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    return false;
  }

  private recordSuccess(): void {
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.isOpen = false;
  }

  private recordFailure(): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    if (this.circuitBreaker.failureCount >= this.FAILURE_THRESHOLD) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.nextRetryTime = new Date(Date.now() + this.RECOVERY_TIMEOUT);
      console.log(`🔧 Circuit breaker opened. Will retry Claude after ${this.RECOVERY_TIMEOUT / 1000}s`);
    }
  }

  /**
   * Stage 1: Get Claude's natural assessment (never ask for JSON directly)
   */
  private async executeClaudeAssessment(
    applicationContent: string,
    fundBrain: any,
    fileName: string
  ): Promise<any> {
    console.log('🧠 Using focused Claude prompts for assessment');

    // Build comprehensive assessment prompt using full fund brain
    const assessmentPrompt = this.buildComprehensivePrompt(applicationContent, fundBrain);

    const claudeResponse = await claudeService.executeTask({
      task: 'assess_application',
      prompt: assessmentPrompt,
      maxTokens: 32000,
      temperature: 0.1
    });

    if (!claudeResponse.success) {
      throw new Error('Claude API call failed');
    }

    // Stage 2: Extract structured data through focused queries
    return this.extractStructuredData(claudeResponse.content, fundBrain);
  }

  /**
   * Stage 2: Extract structured data through multiple focused queries
   */
  private async extractStructuredData(rawAssessment: string, fundBrain: any): Promise<any> {
    console.log('📊 Extracting structured data from Claude response');

    // Get template requirements for targeted field extraction
    const templateAnalysis = fundBrain.outputTemplatesAnalysis;

    const extractionTasks = [
      // Basic assessment fields
      {
        field: 'overallScore',
        prompt: `From this assessment, extract ONLY the overall score as a number between 0-100:\n\n${rawAssessment}`
      },
      {
        field: 'strengths',
        prompt: `From this assessment, list ONLY the main strengths mentioned (max 3):\n\n${rawAssessment}`
      },
      {
        field: 'weaknesses',
        prompt: `From this assessment, list ONLY the main weaknesses mentioned (max 3):\n\n${rawAssessment}`
      },
      {
        field: 'recommendation',
        prompt: `From this assessment, state ONLY the final recommendation (Approve/Decline/Conditional):\n\n${rawAssessment}`
      }
    ];

    // Add template-specific field extractions if we have template analysis
    if (templateAnalysis?.placeholders) {
      extractionTasks.push(...this.generateTemplateExtractionTasks(templateAnalysis.placeholders));
    }

    const extractedData: any = {
      rawAssessment,
      extractedFields: {}
    };

    // Execute focused extractions
    for (const task of extractionTasks) {
      try {
        const response = await claudeService.executeTask({
          task: `extract_${task.field}`,
          prompt: task.prompt,
          maxTokens: 200,
          temperature: 0.0
        });

        if (response.success) {
          extractedData.extractedFields[task.field] = this.parseExtractedField(task.field, response.content);
        }
      } catch (error) {
        console.warn(`Failed to extract ${task.field}:`, error);
      }
    }

    return extractedData;
  }

  private parseExtractedField(fieldName: string, content: string): any {
    const cleanContent = content.trim();

    switch (fieldName) {
      case 'overallScore':
        const scoreMatch = cleanContent.match(/(\d+)/);
        return scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 75;

      case 'strengths':
      case 'weaknesses':
        return cleanContent.split('\n')
          .map(line => line.replace(/^[-*•]\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 3);

      case 'recommendation':
        const rec = cleanContent.toLowerCase();
        if (rec.includes('approve') && !rec.includes('decline')) return 'Approve';
        if (rec.includes('decline')) return 'Decline';
        if (rec.includes('conditional')) return 'Conditional';
        return 'Review Required';

      default:
        return cleanContent;
    }
  }

  private validateClaudeResult(result: any): boolean {
    return !!(
      result &&
      result.extractedFields &&
      typeof result.extractedFields.overallScore === 'number' &&
      result.rawAssessment
    );
  }

  /**
   * Fallback: Keyword-based assessment (transparent, never hidden)
   */
  private async executeKeywordAssessment(
    applicationContent: string,
    fundBrain: any,
    fileName: string
  ): Promise<ResilientAssessmentResult> {
    console.log('🔍 Executing keyword-based fallback assessment');

    const contentLower = applicationContent.toLowerCase();
    let score = 50; // Base score
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Keyword scoring based on fund criteria
    if (fundBrain.criteria) {
      for (const criterion of fundBrain.criteria) {
        const keywords = this.extractKeywordsFromCriterion(criterion);
        const matches = keywords.filter(keyword => contentLower.includes(keyword.toLowerCase()));

        if (matches.length > 0) {
          score += Math.min(15, matches.length * 3);
          strengths.push(`Addresses ${criterion.name} (${matches.length} key terms found)`);
        } else {
          weaknesses.push(`Limited evidence for ${criterion.name}`);
        }
      }
    }

    // Document quality factors
    const wordCount = applicationContent.split(/\s+/).length;
    if (wordCount > 1000) {
      score += 10;
      strengths.push('Comprehensive application with detailed responses');
    } else if (wordCount < 300) {
      score -= 10;
      weaknesses.push('Application lacks sufficient detail');
    }

    // Limit score range
    score = Math.min(95, Math.max(30, score));

    const assessmentData = {
      rawAssessment: `Keyword-based analysis of ${fileName}. Document contains ${wordCount} words.`,
      extractedFields: {
        overallScore: score,
        strengths: strengths.slice(0, 3),
        weaknesses: weaknesses.slice(0, 3),
        recommendation: score >= 70 ? 'Approve' : score >= 50 ? 'Conditional' : 'Decline'
      },
      analysisMode: 'KEYWORD_FALLBACK'
    };

    return {
      success: true,
      strategyUsed: this.strategies.fallback,
      assessmentData,
      transparencyInfo: {
        aiUsed: false,
        userMessage: '📋 Assessment completed using pattern-based analysis (AI unavailable)'
      }
    };
  }

  private extractKeywordsFromCriterion(criterion: any): string[] {
    const text = `${criterion.name} ${criterion.description}`.toLowerCase();

    // Extract meaningful keywords (not just common words)
    const meaningfulWords = text.split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'than'].includes(word));

    return meaningfulWords.slice(0, 10); // Limit to top 10 keywords
  }

  /**
   * Build comprehensive assessment prompt using complete fund brain
   */
  private buildComprehensivePrompt(applicationContent: string, fundBrain: any): string {
    console.log('🧠 Building comprehensive prompt with full fund brain context');

    let prompt = `You are an expert application assessor for ${fundBrain.fundName || 'Unknown Fund'}.

CONTEXT - You have been provided with comprehensive fund intelligence:

`;

    // 1. Application Form Understanding
    if (fundBrain.applicationFormStructure || fundBrain.expectedFields?.length > 0) {
      prompt += `APPLICATION FORM STRUCTURE:
Expected fields: ${fundBrain.expectedFields?.join(', ') || 'Standard application'}
Form requirements: ${fundBrain.formInstructions || 'Follow standard application guidelines'}

`;
    }

    // 2. Selection Criteria
    if (fundBrain.criteria?.length > 0) {
      prompt += `SELECTION CRITERIA:
`;
      fundBrain.criteria.forEach((criterion: any, index: number) => {
        prompt += `${index + 1}. ${criterion.name || criterion.category}: ${criterion.description || criterion.requirements}
`;
        if (criterion.weight) {
          prompt += `   Weight: ${criterion.weight}
`;
        }
      });
      prompt += `
`;
    }

    // 3. Good Examples Learning
    if (fundBrain.successPatterns || fundBrain.exampleQualities?.length > 0) {
      prompt += `SUCCESSFUL APPLICATION PATTERNS:
Average score of successful applications: ${fundBrain.successPatterns?.averageScore || 85}/100
Common strengths: ${fundBrain.successPatterns?.commonStrengths?.join(', ') || 'Clear objectives, strong evidence'}
Key indicators: ${fundBrain.successPatterns?.keyIndicators?.join(', ') || 'Innovation, feasibility, impact'}
`;
      if (fundBrain.exampleQualities?.length > 0) {
        prompt += `Quality indicators from examples: ${fundBrain.exampleQualities.join(', ')}
`;
      }
      prompt += `
`;
    }

    // 4. Output Template Requirements
    if (fundBrain.templateInstructions || fundBrain.requiredSections?.length > 0) {
      prompt += `ASSESSMENT OUTPUT REQUIREMENTS:
Template instructions: ${fundBrain.templateInstructions || 'Provide comprehensive assessment'}
Required sections: ${fundBrain.requiredSections?.join(', ') || 'Score, feedback, recommendation'}

`;
    }

    // 5. Assembled Brain Intelligence (if available)
    if (fundBrain.brainIntelligence) {
      prompt += `FUND BRAIN INTELLIGENCE:
Additional context: This fund has assembled intelligence from processing multiple documents.
Assessment methodology: Use the patterns and intelligence learned from the fund's documentation.

`;
    }

    // Application content (limited to stay within token limits)
    const contentLimit = 3000; // Conservative limit for full context
    const truncatedContent = applicationContent.length > contentLimit
      ? applicationContent.substring(0, contentLimit) + '\n[Content truncated...]'
      : applicationContent;

    prompt += `APPLICATION TO ASSESS:
${truncatedContent}

ASSESSMENT INSTRUCTIONS:
${fundBrain.assessmentInstructions || `Assess this application for ${fundBrain.fundName}`}

Provide a thorough assessment that:
1. Evaluates against each selection criterion using the fund's intelligence
2. Compares against successful application patterns
3. Identifies specific strengths and weaknesses
4. Provides an overall score out of 100
5. Makes a clear recommendation (Approve/Decline/Conditional)

Be specific and reference actual content from the application. Use the fund's accumulated intelligence to make informed judgments.`;

    return prompt;
  }

  /**
   * Generate extraction tasks for template-specific fields
   */
  private generateTemplateExtractionTasks(placeholders: string[]): any[] {
    const templateTasks: any[] = [];

    // Template-specific extraction mapping based on common placeholder patterns
    const extractionMappings = [
      {
        placeholders: ['[To be completed]'],
        context: ['Organisation Name', 'Organization Name', 'Company Name'],
        field: 'organizationName',
        prompt: 'From the original application (NOT the assessment), extract ONLY the organization/company name:'
      },
      {
        placeholders: ['[Number]'],
        context: ['Students Applied For', 'Number of Students'],
        field: 'numberOfStudents',
        prompt: 'From the original application (NOT the assessment), extract ONLY the number of students mentioned in the funding request (look for patterns like "2 students" or "$X [Y students]"):'
      },
      {
        placeholders: ['[Amount]'],
        context: ['Total Funding', 'Funding Requested'],
        field: 'fundingAmount',
        prompt: 'From the original application (NOT the assessment), extract ONLY the total funding amount requested as a number:'
      },
      {
        placeholders: ['[Summary of business history and current products/services]'],
        context: ['Nature of Business', 'Business Summary'],
        field: 'businessSummary',
        prompt: 'From the original application (NOT the assessment), extract the business summary or description of current products/services:'
      },
      {
        placeholders: ['[Outline of recent R&D activities demonstrating active programme]'],
        context: ['R&D Activities'],
        field: 'recentRnDActivities',
        prompt: 'From the original application (NOT the assessment), extract information about recent R&D activities or research work:'
      },
      {
        placeholders: ['[Planned R&D activities showing ongoing programme]'],
        context: ['Future R&D', 'Planned Activities'],
        field: 'plannedRnDActivities',
        prompt: 'From the original application (NOT the assessment), extract information about planned R&D activities or future research:'
      },
      {
        placeholders: ['[How will the student be exposed to technical work relevant to their degree/diploma?]'],
        context: ['Student Exposure', 'Technical Work'],
        field: 'studentExposureDescription',
        prompt: 'From the original application (NOT the assessment), extract how students will be exposed to technical work relevant to their studies:'
      }
    ];

    // For each placeholder in the template, try to find an appropriate extraction task
    for (const placeholder of placeholders) {
      const mapping = extractionMappings.find(m => m.placeholders.includes(placeholder));
      if (mapping) {
        templateTasks.push({
          field: mapping.field,
          prompt: `${mapping.prompt}\n\nORIGINAL APPLICATION CONTENT:\n${this.originalApplicationContent || 'Application content not available'}`
        });
      }
    }

    return templateTasks;
  }

  /**
   * Store original application content for template field extraction
   */
  private originalApplicationContent: string = '';

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): CircuitBreakerState & { status: string } {
    return {
      ...this.circuitBreaker,
      status: this.circuitBreaker.isOpen ? 'OPEN' : 'CLOSED'
    };
  }
}

// Export singleton
export const resilientAssessmentService = new ResilientAssessmentService();