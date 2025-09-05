// AWS Bedrock Claude integration for RAG-powered AI assessment
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.NOLIA_AWS_REGION || process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.NOLIA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NOLIA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Claude model configuration
const CLAUDE_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

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
      max_tokens: 2000,
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
    console.error('Bedrock assessment error:', error);
    throw new Error(`Failed to assess application: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      basePrompt += `TASK: Score this application against the selection criteria (0-100).
      
Return your response in this JSON format:
{
  "score": 85,
  "feedback": "detailed scoring rationale",
  "recommendations": ["ways to improve score"],
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
      criteriaMatch: parsed.criteriaMatch || []
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