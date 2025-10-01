// AWS Bedrock Claude integration for RAG-powered AI assessment
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  // Only use explicit credentials in development when they are intentionally set
  ...(process.env.NODE_ENV === 'development' &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      !process.env.AWS_ACCESS_KEY_ID.startsWith('ASIA') ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {}),
  // In production, omit credentials to use IAM role automatically
});

// Claude model configuration - Updated to use Claude 3.5 Sonnet v2 (working model)
const CLAUDE_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

export interface RAGContext {
  relevantDocuments: string[];
  criteriaText: string;
  goodExamples: string[];
}

export interface AssessmentRequest {
  applicationText: string;
  context: RAGContext;
  assessmentType: 'eligibility' | 'scoring' | 'guidance';
}

export interface AssessmentResult {
  score?: number;
  eligible?: boolean;
  feedback: string;
  recommendations: string[];
  criteriaMatch: {
    criterion: string;
    met: boolean;
    evidence: string;
  }[];
  extractedFields?: {
    organizationName?: string;
    numberOfStudents?: string;
    fundingAmount?: string;
    businessSummary?: string;
    recentRnDActivities?: string;
    plannedRnDActivities?: string;
    studentExposureDescription?: string;
  };
}

/**
 * Invoke Claude via AWS Bedrock for application assessment
 */
export async function assessApplicationWithBedrock(
  request: AssessmentRequest
): Promise<AssessmentResult> {
  try {
    // Build the prompt with RAG context
    const prompt = buildAssessmentPrompt(request);
    
    // Prepare the request payload for Claude
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    // Invoke Claude via Bedrock
    const command = new InvokeModelCommand({
      modelId: CLAUDE_MODEL_ID,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    
    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const claudeResponse = responseBody.content[0].text;
    
    // Parse Claude's structured response
    return parseClaudeResponse(claudeResponse, request.assessmentType);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('Bedrock assessment error:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name || 'Unknown',
      timestamp: new Date().toISOString()
    });

    // Provide specific error messages for different failure types
    if (errorMessage.includes('credentials') || errorMessage.includes('authentication')) {
      throw new Error(`AWS authentication failed: ${errorMessage}`);
    } else if (errorMessage.includes('AccessDeniedException') || errorMessage.includes('Forbidden')) {
      throw new Error(`AWS Bedrock access denied: ${errorMessage}. Check IAM permissions for Bedrock service.`);
    } else if (errorMessage.includes('ThrottlingException') || errorMessage.includes('throttle')) {
      throw new Error(`AWS Bedrock throttling: ${errorMessage}. Too many requests, please retry.`);
    } else if (errorMessage.includes('ValidationException')) {
      throw new Error(`AWS Bedrock validation error: ${errorMessage}. Check request format.`);
    } else if (errorMessage.includes('ResourceNotFoundException')) {
      throw new Error(`AWS Bedrock model not found: ${errorMessage}. Check model ID: ${CLAUDE_MODEL_ID}`);
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      throw new Error(`AWS Bedrock timeout: ${errorMessage}. Service is busy, please retry.`);
    } else {
      throw new Error(`Bedrock assessment failed: ${errorMessage}`);
    }
  }
}

/**
 * Build assessment prompt with RAG context
 */
function buildAssessmentPrompt(request: AssessmentRequest): string {
  const { applicationText, context, assessmentType } = request;
  
  let basePrompt = `You are an expert funding application assessor. Analyze the following application against the provided criteria.

SELECTION CRITERIA:
${context.criteriaText}

GOOD EXAMPLES FOR REFERENCE:
${context.goodExamples.join('\n\n---\n\n')}

RELEVANT DOCUMENTS:
${context.relevantDocuments.join('\n\n---\n\n')}

APPLICATION TO ASSESS:
${applicationText}

`;

  switch (assessmentType) {
    case 'eligibility':
      basePrompt += `TASK: Determine if this application meets the eligibility requirements.
      
Return your response in this JSON format:
{
  "eligible": true/false,
  "feedback": "detailed explanation of eligibility decision",
  "recommendations": ["specific improvement suggestions"],
  "criteriaMatch": [
    {
      "criterion": "specific requirement",
      "met": true/false,
      "evidence": "evidence from application or lack thereof"
    }
  ]
}`;
      break;
      
    case 'scoring':
      basePrompt += `TASK: Score this application against the selection criteria (0-100) AND fill the assessment template.

First, extract the following information from the application:
- Organization/Company Name
- Number of students requested
- Funding amount requested
- Business summary/description
- Recent R&D activities
- Planned R&D activities
- How students will be exposed to technical work

Then return your response in this JSON format:
{
  "score": 85,
  "feedback": "detailed scoring rationale",
  "recommendations": ["ways to improve score"],
  "extractedFields": {
    "organizationName": "extracted organization name",
    "numberOfStudents": "number only",
    "fundingAmount": "amount as number or string",
    "businessSummary": "business description",
    "recentRnDActivities": "recent R&D work description",
    "plannedRnDActivities": "planned R&D activities",
    "studentExposureDescription": "how students will be exposed to technical work"
  },
  "criteriaMatch": [
    {
      "criterion": "specific criterion",
      "met": true/false,
      "evidence": "supporting evidence and score rationale"
    }
  ]
}`;
      break;
      
    case 'guidance':
      basePrompt += `TASK: Provide guidance to improve this application before submission.
      
Return your response in this JSON format:
{
  "feedback": "constructive feedback for improvement",
  "recommendations": ["prioritized improvement suggestions"],
  "criteriaMatch": [
    {
      "criterion": "specific area",
      "met": true/false,
      "evidence": "current status and what's needed"
    }
  ]
}`;
      break;
  }
  
  return basePrompt;
}

/**
 * Parse Claude's response into structured assessment result
 */
function parseClaudeResponse(response: string, assessmentType: string): AssessmentResult {
  try {
    // Extract JSON from Claude's response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      score: parsed.score,
      eligible: parsed.eligible,
      feedback: parsed.feedback,
      recommendations: parsed.recommendations || [],
      criteriaMatch: parsed.criteriaMatch || [],
      extractedFields: parsed.extractedFields || {}
    };
    
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    // Fallback response
    return {
      feedback: response,
      recommendations: [],
      criteriaMatch: []
    };
  }
}

/**
 * Generate embeddings for document storage (placeholder for now)
 */
export async function generateDocumentEmbedding(text: string): Promise<number[]> {
  // For now, return a placeholder
  // In production, we'll use AWS Titan embeddings or OpenAI
  return new Array(1536).fill(0).map(() => Math.random());
}