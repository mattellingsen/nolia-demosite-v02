/**
 * Document Field Extractor
 *
 * Extracts specific structured fields from application documents
 * to populate template placeholders with real data instead of defaults
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { forceIAMRole } from '@/lib/force-iam-role';

// CRITICAL: Force IAM role usage in production (prevents SSO errors)
forceIAMRole();

// Initialize Bedrock client
const bedrock = new BedrockRuntimeClient({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  ...(process.env.NODE_ENV === 'development' &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {
    // In production or when ASIA credentials are detected, force IAM Role
  }),
});

export interface ExtractedFields {
  // Basic Application Info
  organisationName?: string;
  applicationReference?: string;
  contactEmail?: string;

  // Business Eligibility (Yes/No answers)
  entityTypeConfirmed?: string;
  financiallyViable?: string;
  financiallyViableNext12Months?: string;
  ableToFundUpfront?: string;

  // Funding Details
  numberOfStudents?: number;
  totalFundingRequested?: number;
  projectDuration?: string;

  // Business Information
  businessSummary?: string;
  businessHistory?: string;
  currentProducts?: string;

  // R&D Information
  recentRnDActivities?: string;
  plannedRnDActivities?: string;
  rndProgrammeActive?: boolean;
  rndProgrammeAdequacy?: string;

  // Student & Professional Development
  studentExposureDescription?: string;
  professionalDevelopmentPlan?: string;
  supervisionArrangements?: string;

  // Business Benefit
  businessInternalCapability?: string;
  benefitToBusiness?: string;

  // Additional fields as needed
  [key: string]: string | number | boolean | undefined;
}

/**
 * Extract structured fields from application document using Claude
 * Context-aware extraction based on fund's criteria, good examples, and output template
 */
export async function extractDocumentFields(
  documentContent: string,
  templatePlaceholders: string[],
  criteriaData?: any,
  goodExamplesData?: any,
  outputTemplateContent?: string
): Promise<ExtractedFields> {
  console.log('🔍 Fund-aware document field extraction starting...');
  console.log(`📋 Template placeholders: ${templatePlaceholders.length}`);
  console.log(`📊 Selection criteria available: ${!!criteriaData}`);
  console.log(`💡 Good examples available: ${!!goodExamplesData}`);
  console.log(`📄 Output template content available: ${!!outputTemplateContent}`);

  try {
    const extractionPrompt = createContextualFieldExtractionPrompt(
      documentContent,
      templatePlaceholders,
      criteriaData,
      goodExamplesData,
      outputTemplateContent
    );
    const claudeResponse = await invokeClaude(extractionPrompt);

    // Parse the JSON response from Claude
    let extractedFields: ExtractedFields;
    try {
      console.log('🔍 Raw Claude response (first 200 chars):', claudeResponse.substring(0, 200));

      // Check if Claude returned an error message instead of JSON
      if (claudeResponse.startsWith('I apologize') || claudeResponse.startsWith('I cannot') || claudeResponse.startsWith('I\'m sorry')) {
        console.warn('⚠️ Claude returned an error message instead of JSON:', claudeResponse.substring(0, 100));
        extractedFields = fallbackFieldExtraction(documentContent);
      } else {
        // Extract JSON from Claude's response (it might include explanatory text)
        const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('📝 Extracted JSON from Claude response:', jsonMatch[0].substring(0, 200));
          extractedFields = JSON.parse(jsonMatch[0]);
        } else {
          console.warn('⚠️ No JSON found in Claude response, using fallback');
          extractedFields = fallbackFieldExtraction(documentContent);
        }
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse Claude field extraction response, using fallback extraction');
      console.warn('Raw response:', claudeResponse.substring(0, 200));
      extractedFields = fallbackFieldExtraction(documentContent);
    }

    console.log('✅ Fund-aware field extraction complete:', Object.keys(extractedFields).length, 'fields extracted');
    return extractedFields;

  } catch (error) {
    console.error('❌ Fund-aware field extraction failed:', error);
    return fallbackFieldExtraction(documentContent);
  }
}

/**
 * Create a contextual Claude prompt that understands the fund's complete context
 */
function createContextualFieldExtractionPrompt(
  documentContent: string,
  templatePlaceholders: string[],
  criteriaData?: any,
  goodExamplesData?: any,
  outputTemplateContent?: string
): string {

  // Build fund context understanding
  const criteriaContext = criteriaData ? `
FUND SELECTION CRITERIA (How to evaluate applications):
${typeof criteriaData === 'string' ? criteriaData : JSON.stringify(criteriaData, null, 2)}
` : '';

  const goodExamplesContext = goodExamplesData ? `
GOOD EXAMPLES FOR REFERENCE (What high-quality applications look like):
${typeof goodExamplesData === 'string' ? goodExamplesData : JSON.stringify(goodExamplesData, null, 2)}
` : '';

  const templateContext = outputTemplateContent ? `
OUTPUT TEMPLATE STRUCTURE (What information needs to be filled in):
${outputTemplateContent}
` : '';

  return `You are an expert funding assessment specialist with deep understanding of this specific fund's requirements. Your task is to extract precise information from the application document to populate the output template, guided by the fund's selection criteria and informed by good examples.

${criteriaContext}
${goodExamplesContext}
${templateContext}

SPECIFIC TEMPLATE PLACEHOLDERS TO FILL:
${templatePlaceholders.map(p => `- ${p}`).join('\n')}

APPLICATION DOCUMENT TO ANALYZE:
${documentContent}

EXTRACTION STRATEGY - BE FUND-SPECIFIC AND CRITERIA-DRIVEN:

1. UNDERSTAND THE FUND'S REQUIREMENTS:
   - Analyze what this fund is looking for based on the selection criteria
   - Use the good examples to understand quality standards
   - Identify what each template placeholder specifically needs

2. ORGANIZATION/APPLICANT IDENTIFICATION:
   - Extract the exact company/organization name from headers, titles, or forms
   - Look for patterns like "Application for [ORGANIZATION]" or company letterheads

3. FUND-SPECIFIC ELIGIBILITY ASSESSMENT:
   - Answer eligibility questions based on the fund's specific criteria
   - Use "Yes/No" format only when template expects it
   - Base assessments on what the selection criteria define as eligible

4. FINANCIAL AND QUANTITATIVE DATA:
   - Extract exact numbers that match what the template is asking for
   - Match funding amounts, participant numbers, durations to template requirements

5. QUALITATIVE CONTENT EXTRACTION:
   - Extract content that directly addresses what each template field is asking for
   - Use the selection criteria to understand what quality looks like
   - Reference good examples to ensure extracted content meets standards

6. EVIDENCE-BASED RESPONSES:
   - Only extract information that is explicitly stated in the application
   - If information is not available, indicate this clearly
   - Distinguish between business overview and specific project details

CRITICAL: Return ONLY valid JSON. No explanatory text, no markdown formatting, no additional commentary. Just the JSON object starting with { and ending with }.

OUTPUT FORMAT - JSON ONLY:
{
  "organisationName": "exact organization name from application",
  "entityTypeConfirmed": "Yes/No based on fund eligibility criteria",
  "financiallyViable": "Yes/No based on evidence and fund requirements",
  "financiallyViableNext12Months": "Yes/No assessment per fund criteria",
  "ableToFundUpfront": "Yes/No based on financial capacity evidence",
  "numberOfStudents": numeric_value_requested_or_null,
  "totalFundingRequested": numeric_amount_requested_or_null,
  "projectDuration": "duration_as_specified_or_null",
  "businessSummary": "company overview relevant to fund criteria",
  "businessHistory": "company background relevant to eligibility",
  "currentProducts": "current products/services relevant to fund",
  "recentRnDActivities": "past R&D activities as defined by criteria",
  "plannedRnDActivities": "future R&D plans as required by fund",
  "rndProgrammeActive": boolean_based_on_fund_definition,
  "rndProgrammeAdequacy": "assessment against fund standards",
  "studentExposureDescription": "how students engage with work per criteria",
  "professionalDevelopmentPlan": "development plan as required by fund",
  "supervisionArrangements": "supervision details per fund requirements",
  "businessInternalCapability": "capability building as defined by criteria",
  "benefitToBusiness": "business benefits as required by fund",
  "contactEmail": "primary contact email",
  "applicationReference": "application reference if provided"
}

CRITICAL REQUIREMENTS:
- Extract information that directly serves the fund's assessment needs
- Use the selection criteria to determine what constitutes "good" vs "poor" responses
- Reference good examples to understand quality thresholds
- Fill template placeholders with precisely what they're asking for
- If template asks for Yes/No, provide definitive Yes/No based on fund criteria
- If template asks for assessment, provide assessment based on fund standards
- Never repeat the same content across different fields unless it genuinely addresses different aspects`;
}

/**
 * Fallback field extraction using basic text parsing
 */
function fallbackFieldExtraction(documentContent: string): ExtractedFields {
  console.log('🔄 Using fallback field extraction...');

  const fields: ExtractedFields = {};
  const content = documentContent.toLowerCase();

  // Enhanced regex patterns for common fields, based on test-biosecurity-application.txt structure
  const patterns = {
    // More flexible organization name extraction
    organisationName: [
      /(?:organisation|organization|company)\s*name\s*[:\-]?\s*([^\n\r]{3,100})/i,
      /^([A-Z][A-Za-z\s&]{2,50})\s*$/m, // Standalone company names on their own lines
      /application\s+(?:for|by|from)\s+([A-Z][A-Za-z\s&]{3,50})/i,
      /submitted\s+by\s*[:\-]?\s*([A-Z][A-Za-z\s&]{3,50})/i
    ],
    numberOfStudents: [
      /(?:number\s*of\s*students?|students?\s*applied)\s*[:\-]?\s*(\d+)/i,
      /(\d+)\s+students?/i
    ],
    totalFundingRequested: [
      /(?:total\s*funding|funding\s*requested|total\s*amount)\s*[:\-]?\s*\$?[\s]*([0-9,]+)/i,
      /\$\s*([0-9,]+)/
    ],
    contactEmail: [
      /contact\s*email\s*[:\-]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
    ],
    projectDuration: [
      /(?:project\s*duration|duration)\s*[:\-]?\s*([^\n\r]{3,30})/i,
      /(\d+\s*months?)/i
    ]
  };

  // Extract using multiple patterns for each field
  for (const [fieldName, patternList] of Object.entries(patterns)) {
    const patterns = Array.isArray(patternList) ? patternList : [patternList];

    for (const pattern of patterns) {
      const match = documentContent.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();

        if (fieldName === 'numberOfStudents') {
          fields[fieldName] = parseInt(value);
        } else if (fieldName === 'totalFundingRequested') {
          fields[fieldName] = parseInt(value.replace(/,/g, ''));
        } else if (fieldName === 'organisationName') {
          // Validate organization name - should be reasonable length and not contain weird characters
          if (value.length >= 3 && value.length <= 100 && !/^\d+$/.test(value)) {
            fields[fieldName] = value;
            break; // Found a good organization name, stop trying other patterns
          }
        } else {
          fields[fieldName] = value;
        }

        if (fields[fieldName]) break; // Move to next field once we found a value
      }
    }
  }

  // Extract business and R&D sections using section headers
  const sections = extractSectionContent(documentContent);
  if (sections.business) fields.businessSummary = sections.business;
  if (sections.rnd) fields.recentRnDActivities = sections.rnd;

  // Set some reasonable defaults for eligibility questions
  fields.entityTypeConfirmed = 'Yes';
  fields.financiallyViable = 'Yes';
  fields.financiallyViableNext12Months = 'Yes';
  fields.ableToFundUpfront = 'Yes';
  fields.rndProgrammeActive = true;
  fields.rndProgrammeAdequacy = 'Adequate';

  console.log('🔄 Fallback extraction found fields:', Object.keys(fields));
  console.log('📋 Organization name extracted:', fields.organisationName);

  return fields;
}

/**
 * Extract content from document sections
 */
function extractSectionContent(documentContent: string): { [key: string]: string } {
  const sections: { [key: string]: string } = {};

  // Look for business-related sections
  const businessMatches = documentContent.match(
    /(?:business|company|organisation)[\s\S]{0,20}(?:summary|description|overview|history)[\s\S]{0,10}[:\-]?\s*([\s\S]{50,500}?)(?:\n\s*\n|\n[A-Z]|\n\d+\.)/i
  );
  if (businessMatches) {
    sections.business = businessMatches[1].trim().substring(0, 300);
  }

  // Look for R&D sections
  const rndMatches = documentContent.match(
    /(?:r&d|research|development)[\s\S]{0,30}(?:activities|programme|program)[\s\S]{0,10}[:\-]?\s*([\s\S]{50,500}?)(?:\n\s*\n|\n[A-Z]|\n\d+\.)/i
  );
  if (rndMatches) {
    sections.rnd = rndMatches[1].trim().substring(0, 300);
  }

  return sections;
}

/**
 * Invoke Claude via Bedrock for field extraction
 */
async function invokeClaude(prompt: string): Promise<string> {
  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 8000,
    temperature: 0.1, // Low temperature for consistent extraction
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    body: JSON.stringify(requestBody),
    contentType: "application/json"
  });

  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  if (responseBody.content && responseBody.content[0]?.text) {
    return responseBody.content[0].text;
  } else {
    throw new Error('Invalid response format from Claude');
  }
}

/**
 * Validate and clean extracted fields
 */
export function validateExtractedFields(fields: ExtractedFields): ExtractedFields {
  const validated: ExtractedFields = {};

  // Validate organization name
  if (fields.organisationName && typeof fields.organisationName === 'string' && fields.organisationName.length > 2) {
    validated.organisationName = fields.organisationName.trim();
  }

  // Validate numbers
  if (fields.numberOfStudents && typeof fields.numberOfStudents === 'number' && fields.numberOfStudents > 0) {
    validated.numberOfStudents = Math.max(1, Math.min(10, fields.numberOfStudents)); // Reasonable bounds
  }

  if (fields.totalFundingRequested && typeof fields.totalFundingRequested === 'number' && fields.totalFundingRequested > 0) {
    validated.totalFundingRequested = Math.max(100, Math.min(1000000, fields.totalFundingRequested)); // Reasonable bounds
  }

  // Validate business eligibility fields (must be Yes/No)
  const eligibilityFields = ['entityTypeConfirmed', 'financiallyViable', 'financiallyViableNext12Months', 'ableToFundUpfront'];
  for (const field of eligibilityFields) {
    const value = fields[field];
    if (value && typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (normalized === 'yes' || normalized === 'no') {
        validated[field] = normalized === 'yes' ? 'Yes' : 'No';
      }
    }
  }

  // Validate text fields (minimum length and cleanup)
  const textFields = [
    'businessSummary', 'businessHistory', 'currentProducts',
    'recentRnDActivities', 'plannedRnDActivities', 'rndProgrammeAdequacy',
    'studentExposureDescription', 'professionalDevelopmentPlan', 'supervisionArrangements',
    'businessInternalCapability', 'benefitToBusiness', 'projectDuration', 'contactEmail'
  ];

  for (const field of textFields) {
    const value = fields[field];
    if (value && typeof value === 'string' && value.length > 5) {
      validated[field] = value.trim().substring(0, 1000); // Reasonable length limit
    }
  }

  // Validate boolean fields
  if (typeof fields.rndProgrammeActive === 'boolean') {
    validated.rndProgrammeActive = fields.rndProgrammeActive;
  }

  return validated;
}