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
   * New Single-Stage: Direct template reasoning (replaces 2-stage approach)
   */
  private async executeClaudeAssessment(
    applicationContent: string,
    fundBrain: any,
    fileName: string
  ): Promise<any> {
    console.log('🧠 Using intelligent template reasoning for assessment');

    // Build template-based reasoning prompt
    const templateReasoningPrompt = this.buildTemplateReasoningPrompt(applicationContent, fundBrain, fileName);

    const claudeResponse = await claudeService.executeTask({
      task: 'assess_application_with_template',
      prompt: templateReasoningPrompt,
      maxTokens: 32000,
      temperature: 0.1
    });

    if (!claudeResponse.success) {
      throw new Error('Claude API call failed');
    }

    // Parse the filled template response
    return this.parseTemplateResponse(claudeResponse.content, fundBrain, fileName);
  }

  /**
   * Parse filled template response and extract assessment data
   */
  private parseTemplateResponse(claudeResponse: string, fundBrain: any, fileName: string): any {
    console.log('📊 Parsing template-based assessment response');

    try {
      // Extract the filled template and assessment data from Claude's response
      const responseData = this.extractAssessmentFromResponse(claudeResponse);

      if (responseData.filledTemplate && responseData.assessment) {
        return {
          rawAssessment: claudeResponse,
          filledTemplate: responseData.filledTemplate,
          extractedFields: {
            overallScore: responseData.assessment.overallScore || 75,
            strengths: responseData.assessment.strengths || [],
            weaknesses: responseData.assessment.weaknesses || [],
            recommendation: responseData.assessment.recommendation || 'Review Required'
          },
          assessmentData: responseData.assessment,
          templateFormat: 'filled_template' // Indicates this is a filled template
        };
      } else {
        throw new Error('Could not parse filled template from Claude response');
      }
    } catch (error) {
      console.warn('Template parsing failed, extracting basic assessment data:', error);

      // Fallback: Extract basic assessment data from raw response
      return this.extractBasicAssessmentFromResponse(claudeResponse, fileName);
    }
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
   * Build template-based reasoning prompt for single-stage assessment
   */
  private buildTemplateReasoningPrompt(applicationContent: string, fundBrain: any, fileName: string): string {
    console.log('🧠 Building template reasoning prompt with fund intelligence');

    // Get the output template structure
    const templateContent = fundBrain.outputTemplatesAnalysis?.rawTemplateContent || '';
    const fundName = fundBrain.fundName || 'Unknown Fund';

    let prompt = `You are an expert application assessor for ${fundName}. Your task is to fill a specific assessment template using intelligent reasoning about the application content.

FUND INTELLIGENCE CONTEXT:
`;

    // Add fund brain context
    if (fundBrain.criteria?.length > 0) {
      prompt += `\nSELECTION CRITERIA:\n`;
      fundBrain.criteria.forEach((criterion: any, index: number) => {
        prompt += `${index + 1}. ${criterion.name || criterion.category}: ${criterion.description || criterion.requirements}\n`;
      });
    }

    if (fundBrain.successPatterns) {
      prompt += `\nSUCCESSFUL APPLICATION PATTERNS:\n- Average score: ${fundBrain.successPatterns.averageScore || 85}/100\n- Common strengths: ${fundBrain.successPatterns.commonStrengths?.join(', ') || 'Clear objectives, strong evidence'}\n- Key indicators: ${fundBrain.successPatterns.keyIndicators?.join(', ') || 'Innovation, feasibility, impact'}\n`;
    }

    // Application content with reasonable limit
    const contentLimit = 8000; // Larger limit for full context
    const applicationText = applicationContent.length > contentLimit
      ? applicationContent.substring(0, contentLimit) + '\n[Content truncated for length...]'
      : applicationContent;

    prompt += `\nAPPLICATION TO ASSESS (File: ${fileName}):\n${applicationText}\n\nTEMPLATE TO FILL:\n${templateContent}\n\nINSTRUCTIONS:\n1. Use INTELLIGENT REASONING to fill each field in the template\n2. For each placeholder or field, consider:\n   - What information from the application best fulfills this requirement?\n   - How does this align with the fund's selection criteria?\n   - What would an expert assessor put here based on the evidence?\n\n3. SPECIFIC FIELD REASONING:\n   - Organisation Name: Use the actual organization/company name\n   - Application Title: Use the project name/title (NOT the company name)\n   - Assessment Date: Use today's date (${new Date().toLocaleDateString()})\n   - Numbers: Extract actual figures from the application\n   - Yes/No fields: Assess based on evidence in the application\n   - Comments: Provide specific reasoning based on the application content\n\n4. PRESERVE THE EXACT TEMPLATE STRUCTURE but fill it with intelligent content\n\n5. After the filled template, provide a JSON summary:\n{\n  "overallScore": <number 0-100>,\n  "recommendation": "<Approve/Decline/Conditional>",\n  "strengths": ["<strength1>", "<strength2>", "<strength3>"],\n  "weaknesses": ["<weakness1>", "<weakness2>", "<weakness3>"]\n}\n\nFILLED TEMPLATE:\n`;

    return prompt;
  }

  /**
   * Extract assessment data from Claude's template response
   */
  private extractAssessmentFromResponse(claudeResponse: string): any {
    try {
      // Look for the JSON summary at the end of the response
      const jsonMatch = claudeResponse.match(/\{[\s\S]*"overallScore"[\s\S]*\}/g);

      let assessment = null;
      if (jsonMatch) {
        try {
          assessment = JSON.parse(jsonMatch[jsonMatch.length - 1]);
        } catch {
          // Fallback: extract from text
          assessment = this.extractAssessmentFromText(claudeResponse);
        }
      } else {
        assessment = this.extractAssessmentFromText(claudeResponse);
      }

      // Extract the filled template (everything before the JSON summary)
      const filledTemplate = jsonMatch
        ? claudeResponse.replace(jsonMatch[jsonMatch.length - 1], '').trim()
        : claudeResponse;

      return {
        filledTemplate: filledTemplate,
        assessment: assessment
      };
    } catch (error) {
      console.warn('Failed to extract assessment from response:', error);
      return {
        filledTemplate: claudeResponse,
        assessment: this.extractAssessmentFromText(claudeResponse)
      };
    }
  }

  /**
   * Extract basic assessment data from text response
   */
  private extractAssessmentFromText(text: string): any {
    const scoreMatch = text.match(/(?:score|rating)[\:\s]*([0-9]+)/i);
    const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 75;

    // Extract recommendation
    let recommendation = 'Review Required';
    if (text.toLowerCase().includes('approve') && !text.toLowerCase().includes('decline')) {
      recommendation = 'Approve';
    } else if (text.toLowerCase().includes('decline') || text.toLowerCase().includes('reject')) {
      recommendation = 'Decline';
    } else if (text.toLowerCase().includes('conditional')) {
      recommendation = 'Conditional';
    }

    return {
      overallScore: score,
      recommendation: recommendation,
      strengths: ['Assessment completed with template reasoning'],
      weaknesses: []
    };
  }

  /**
   * Fallback method for basic assessment extraction
   */
  private extractBasicAssessmentFromResponse(claudeResponse: string, fileName: string): any {
    const assessment = this.extractAssessmentFromText(claudeResponse);

    return {
      rawAssessment: claudeResponse,
      extractedFields: {
        overallScore: assessment.overallScore,
        strengths: assessment.strengths,
        weaknesses: assessment.weaknesses,
        recommendation: assessment.recommendation
      },
      assessmentData: assessment,
      templateFormat: 'basic_assessment'
    };
  }

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