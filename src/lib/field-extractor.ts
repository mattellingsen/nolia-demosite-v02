/**
 * Field Extractor - Reliable Data Extraction from Applications
 *
 * Uses focused Claude prompts to extract specific data fields from application documents.
 * Each extraction task is focused and has clear fallbacks.
 */

import { claudeService, ClaudeService, ClaudeRequest } from './claude-service';

export interface ExtractedApplicationData {
  // Organization details
  organisationName?: string;
  contactEmail?: string;
  entityTypeConfirmed?: string;

  // Financial information
  financiallyViable?: string;
  financiallyViableNext12Months?: string;
  ableToFundUpfront?: string;
  numberOfStudents?: number;
  totalFundingRequested?: number;
  projectDuration?: string;

  // Business information
  businessSummary?: string;
  businessHistory?: string;
  currentProducts?: string;

  // R&D information
  recentRnDActivities?: string;
  plannedRnDActivities?: string;
  rndProgrammeActive?: boolean;
  rndProgrammeAdequacy?: string;

  // Student-related information
  studentExposureDescription?: string;
  professionalDevelopmentPlan?: string;
  supervisionArrangements?: string;
  businessInternalCapability?: string;
  benefitToBusiness?: string;

  // Generated fields
  applicationReference?: string;
}

export interface FieldExtractionStatus {
  success: boolean;
  extractedFields: ExtractedApplicationData;
  aiUsed: boolean;
  failedExtractions: string[];
  extractionDetails: {
    [fieldName: string]: {
      success: boolean;
      aiUsed: boolean;
      value?: any;
      error?: string;
    };
  };
}

export class FieldExtractor {

  /**
   * Extract all required fields from an application document
   */
  async extractFields(
    documentContent: string,
    templatePlaceholders: string[] = []
  ): Promise<FieldExtractionStatus> {

    console.log('📊 Starting field extraction from application document');
    console.log(`📝 Document length: ${documentContent.length} characters`);
    console.log(`🎯 Template placeholders: ${templatePlaceholders.length}`);

    const extractedFields: ExtractedApplicationData = {};
    const extractionDetails: { [key: string]: any } = {};
    const failedExtractions: string[] = [];
    let aiUsedForAnyField = false;

    // Define extraction tasks - each is focused and specific
    const extractionTasks = [
      {
        category: 'organization',
        fields: ['organisationName', 'contactEmail', 'entityTypeConfirmed'],
      },
      {
        category: 'financial',
        fields: ['totalFundingRequested', 'numberOfStudents', 'projectDuration'],
      },
      {
        category: 'business',
        fields: ['businessSummary', 'recentRnDActivities', 'plannedRnDActivities'],
      },
      {
        category: 'student',
        fields: ['studentExposureDescription', 'professionalDevelopmentPlan', 'benefitToBusiness'],
      },
    ];

    // Extract fields in focused batches
    for (const task of extractionTasks) {
      try {
        const taskResult = await this.extractFieldCategory(
          documentContent,
          task.category,
          task.fields
        );

        if (taskResult.success) {
          aiUsedForAnyField = true;

          // Merge extracted data
          Object.assign(extractedFields, taskResult.data);

          // Record extraction details
          task.fields.forEach(field => {
            extractionDetails[field] = {
              success: true,
              aiUsed: true,
              value: taskResult.data[field],
            };
          });
        } else {
          // AI extraction failed, try fallback
          console.warn(`⚠️ AI extraction failed for ${task.category}, using fallbacks`);

          const fallbackResults = this.applyFallbackExtraction(
            documentContent,
            task.fields
          );

          Object.assign(extractedFields, fallbackResults);

          task.fields.forEach(field => {
            if (fallbackResults[field] !== undefined) {
              extractionDetails[field] = {
                success: true,
                aiUsed: false,
                value: fallbackResults[field],
              };
            } else {
              extractionDetails[field] = {
                success: false,
                aiUsed: false,
                error: 'Both AI and fallback extraction failed',
              };
              failedExtractions.push(field);
            }
          });
        }
      } catch (error) {
        console.error(`❌ Extraction failed for category ${task.category}:`, error);
        task.fields.forEach(field => {
          extractionDetails[field] = {
            success: false,
            aiUsed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          failedExtractions.push(field);
        });
      }
    }

    // Add generated fields
    extractedFields.applicationReference = this.generateApplicationReference();
    extractionDetails.applicationReference = {
      success: true,
      aiUsed: false,
      value: extractedFields.applicationReference,
    };

    const overallSuccess = failedExtractions.length === 0;

    console.log(`📊 Field extraction completed:`);
    console.log(`   ✅ Successful extractions: ${Object.keys(extractedFields).length}`);
    console.log(`   ❌ Failed extractions: ${failedExtractions.length}`);
    console.log(`   🤖 AI used: ${aiUsedForAnyField ? 'Yes' : 'No'}`);

    return {
      success: overallSuccess,
      extractedFields,
      aiUsed: aiUsedForAnyField,
      failedExtractions,
      extractionDetails,
    };
  }

  /**
   * Extract a specific category of fields using focused Claude prompts
   */
  private async extractFieldCategory(
    documentContent: string,
    category: string,
    fields: string[]
  ): Promise<{ success: boolean; data: any }> {

    const prompt = this.createCategoryExtractionPrompt(documentContent, category, fields);

    const request: ClaudeRequest = {
      task: `extract_${category}_fields`,
      prompt,
      maxTokens: 1500,
      temperature: 0.1, // Low temperature for factual extraction
    };

    const response = await claudeService.executeTask(request);

    if (!response.success) {
      return { success: false, data: {} };
    }

    try {
      // Parse Claude's response as JSON
      const extractedData = this.parseExtractionResponse(response.content, fields);
      return { success: true, data: extractedData };
    } catch (error) {
      console.error(`❌ Failed to parse extraction response for ${category}:`, error);
      return { success: false, data: {} };
    }
  }

  /**
   * Create a focused prompt for extracting specific fields
   */
  private createCategoryExtractionPrompt(
    documentContent: string,
    category: string,
    fields: string[]
  ): string {

    const instructions = this.getCategoryInstructions(category);
    const outputFormat = this.createOutputFormat(fields);

    return ClaudeService.createFocusedPrompt(
      `Extract ${category} information`,
      documentContent,
      instructions,
      outputFormat
    );
  }

  /**
   * Get specific instructions for each field category
   */
  private getCategoryInstructions(category: string): string {
    const instructions = {
      organization: `
        Extract organization and contact information. Look for:
        - Company/organization name (exactly as written)
        - Email addresses (any format)
        - Entity type confirmation (look for "limited company", "trust", "partnership", etc.)
      `,
      financial: `
        Extract financial and project information. Look for:
        - Total funding amount requested (numbers only, no currency symbols)
        - Number of students (integer only)
        - Project duration (e.g., "12 months", "2 years")
      `,
      business: `
        Extract business and R&D information. Look for:
        - Business summary (1-2 sentences about what the company does)
        - Recent R&D activities (what they've done in the last 12 months)
        - Planned R&D activities (what they plan to do)
      `,
      student: `
        Extract student-related information. Look for:
        - How students will be exposed to R&D work
        - Professional development plans for students
        - How the business will benefit from students
      `,
    };

    return instructions[category as keyof typeof instructions] || 'Extract the specified information.';
  }

  /**
   * Create JSON output format specification
   */
  private createOutputFormat(fields: string[]): string {
    const fieldExamples = {
      organisationName: '"Company Name Ltd"',
      contactEmail: '"contact@company.com"',
      entityTypeConfirmed: '"Yes" or "No"',
      totalFundingRequested: 50000,
      numberOfStudents: 2,
      projectDuration: '"12 months"',
      businessSummary: '"Brief description of what the company does"',
      recentRnDActivities: '"What R&D work they completed recently"',
      plannedRnDActivities: '"What R&D work they plan to do"',
      studentExposureDescription: '"How students will be exposed to R&D"',
      professionalDevelopmentPlan: '"How students will be developed professionally"',
      benefitToBusiness: '"How the business will benefit from students"',
    };

    const jsonExample: any = {};
    fields.forEach(field => {
      jsonExample[field] = fieldExamples[field as keyof typeof fieldExamples] || `"Value for ${field}"`;
    });

    return `Respond with only valid JSON in this exact format:\n${JSON.stringify(jsonExample, null, 2)}`;
  }

  /**
   * Parse Claude's extraction response
   */
  private parseExtractionResponse(content: string, expectedFields: string[]): any {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate that we got the expected fields
      const result: any = {};
      expectedFields.forEach(field => {
        if (parsed[field] !== undefined && parsed[field] !== null && parsed[field] !== '') {
          result[field] = parsed[field];
        }
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error}`);
    }
  }

  /**
   * Fallback extraction using simple pattern matching
   */
  private applyFallbackExtraction(documentContent: string, fields: string[]): any {
    const result: any = {};
    const content = documentContent.toLowerCase();

    // Simple pattern matching for common fields
    if (fields.includes('organisationName')) {
      const orgMatch = documentContent.match(/(?:company name|organisation name|organization name)[:]\s*([^\n\r]+)/i);
      if (orgMatch) {
        result.organisationName = orgMatch[1].trim();
      }
    }

    if (fields.includes('totalFundingRequested')) {
      const amountMatch = documentContent.match(/(?:funding requested|total funding|amount)[:]\s*[\$]?([0-9,]+)/i);
      if (amountMatch) {
        result.totalFundingRequested = parseInt(amountMatch[1].replace(/,/g, ''));
      }
    }

    if (fields.includes('numberOfStudents')) {
      const studentMatch = documentContent.match(/(?:number of students|students)[:]\s*([0-9]+)/i);
      if (studentMatch) {
        result.numberOfStudents = parseInt(studentMatch[1]);
      }
    }

    if (fields.includes('contactEmail')) {
      const emailMatch = documentContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        result.contactEmail = emailMatch[1];
      }
    }

    return result;
  }

  /**
   * Generate a unique application reference
   */
  private generateApplicationReference(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `APP-${year}${month}${day}-${random}`;
  }
}

// Export singleton instance
export const fieldExtractor = new FieldExtractor();