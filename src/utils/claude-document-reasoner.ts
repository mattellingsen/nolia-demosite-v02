// Claude-powered Document Reasoning Service
// Uses Claude via AWS Bedrock for superior analytical reasoning and document understanding

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

interface DocumentContext {
  filename: string;
  content: string;
  extractedSections: string[];
}

interface ReasonedCriteriaAnalysis {
  // Enhanced analysis with Claude reasoning
  documentRoles: Array<{
    filename: string;
    identifiedRole: string;
    purpose: string;
    keyContributions: string[];
  }>;
  
  unifiedCriteria: Array<{
    category: string;
    weight: number;
    requirements: string[];
    sourceDocuments: string[];
    reasoning: string;
  }>;
  
  conflictsIdentified: Array<{
    type: 'weight_mismatch' | 'requirement_conflict' | 'scoring_inconsistency';
    description: string;
    affectedDocuments: string[];
    recommendation: string;
  }>;
  
  synthesizedFramework: {
    scoringMethod: 'Points' | 'Percentage' | 'Pass/Fail';
    passingThreshold: number;
    weightingJustification: string;
    assessmentProcess: string[];
  };
  
  // Keep original data for backward compatibility
  criteriaFound: number;
  weightings: Array<{ name: string; weight: number }>;
  categories: string[];
  detectedCriteria: string[];
  textContent: string;
  extractedSections: any[];
}

// Initialize Bedrock client (uses IAM role in production, local AWS profile for development)
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'ap-southeast-2'
  // No explicit credentials - will use IAM role in production or local AWS profile
});

/**
 * Analyze selection criteria documents with Claude's superior reasoning
 * Provides human-expert level document analysis and conflict resolution
 */
export async function analyzeSelectionCriteriaWithClaude(
  documentContexts: DocumentContext[]
): Promise<ReasonedCriteriaAnalysis> {
  
  // Skip Claude if AWS region not configured (fallback to basic analysis)
  if (!process.env.AWS_REGION) {
    console.log('🤖 AWS region not configured, using basic analysis');
    return await fallbackToBasicAnalysis(documentContexts);
  }

  try {
    console.log(`🧠 Starting Claude reasoning analysis on ${documentContexts.length} documents`);
    
    // Step 1: Identify document roles with Claude's superior understanding
    const documentRoles = await identifyDocumentRolesWithClaude(documentContexts);
    
    // Step 2: Cross-reference criteria with deep contextual analysis
    const criteriaAnalysis = await crossReferenceCriteriaWithClaude(documentContexts, documentRoles);
    
    // Step 3: Identify conflicts with nuanced understanding
    const conflicts = await identifyConflictsWithClaude(documentContexts, criteriaAnalysis);
    
    // Step 4: Synthesize unified framework with superior logic
    const framework = await synthesizeFrameworkWithClaude(documentContexts, criteriaAnalysis, conflicts);
    
    // Step 5: Generate final reasoned analysis
    const reasonedAnalysis: ReasonedCriteriaAnalysis = {
      documentRoles,
      unifiedCriteria: criteriaAnalysis,
      conflictsIdentified: conflicts,
      synthesizedFramework: framework,
      
      // Backward compatibility fields
      criteriaFound: criteriaAnalysis.reduce((sum, c) => sum + c.requirements.length, 0),
      weightings: criteriaAnalysis.map(c => ({ name: c.category, weight: c.weight })),
      categories: criteriaAnalysis.map(c => c.category),
      detectedCriteria: criteriaAnalysis.flatMap(c => c.requirements),
      textContent: documentContexts.map(d => d.content).join('\n\n'),
      extractedSections: documentContexts.flatMap(d => d.extractedSections)
    };
    
    console.log(`🧠 Claude reasoning complete: ${reasonedAnalysis.unifiedCriteria.length} unified criteria, ${conflicts.length} conflicts identified`);
    
    return reasonedAnalysis;
    
  } catch (error) {
    console.error('🤖 Claude reasoning failed, falling back to basic analysis:', error);
    return await fallbackToBasicAnalysis(documentContexts);
  }
}

/**
 * Step 1: Claude identifies document roles with superior contextual understanding
 */
async function identifyDocumentRolesWithClaude(documentContexts: DocumentContext[]) {
  const prompt = `You are an expert grant administrator with deep experience in funding program design. Analyze these funding assessment documents and identify each document's specific role and purpose within the overall assessment framework.

For each document, provide:
1. Specific role (e.g., "Primary Application Template", "Technical Assessment Rubric", "Eligibility Requirements", "Scoring Guidelines")
2. Primary purpose and function
3. Key contributions to the assessment framework
4. How it relates to other documents

Documents to analyze:
${documentContexts.map(doc => `
═══ DOCUMENT: ${doc.filename} ═══
SECTIONS IDENTIFIED: ${doc.extractedSections.slice(0, 15).join(', ')}${doc.extractedSections.length > 15 ? '...' : ''}

CONTENT SAMPLE (first 2000 characters):
${doc.content.substring(0, 2000)}...

CONTENT SAMPLE (middle section):
${doc.content.substring(Math.floor(doc.content.length/2), Math.floor(doc.content.length/2) + 1500)}...
`).join('\n')}

Provide your analysis as a JSON array with this exact structure:
{
  "documents": [
    {
      "filename": "exact_filename.docx",
      "identifiedRole": "Primary Application Template",
      "purpose": "Defines the structure, questions, and information requirements for applicants",
      "keyContributions": [
        "Application question framework",
        "Required information fields and sections",
        "Application submission structure"
      ]
    }
  ]
}`;

  const response = await invokeClaude(prompt, 'Document role identification');
  const result = JSON.parse(response);
  return result.documents || [];
}

/**
 * Step 2: Cross-reference criteria with Claude's superior analytical reasoning
 */
async function crossReferenceCriteriaWithClaude(documentContexts: DocumentContext[], documentRoles: any[]) {
  const prompt = `You are analyzing funding assessment documents to create a unified, comprehensive assessment framework. Your goal is to understand how all documents work together and resolve any ambiguities.

DOCUMENT ROLES IDENTIFIED:
${documentRoles.map(role => `• ${role.filename}: ${role.identifiedRole} - ${role.purpose}`).join('\n')}

FULL DOCUMENT ANALYSIS:
${documentContexts.map(doc => `
═══ ${doc.filename} ═══
ROLE: ${documentRoles.find(r => r.filename === doc.filename)?.identifiedRole || 'Unknown'}
CONTENT: ${doc.content.substring(0, 3000)}...
`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Identify ALL assessment categories across all documents
2. Determine accurate weightings by analyzing document emphasis and explicit percentages  
3. Extract specific, actionable requirements for each category
4. Cross-reference requirements across documents to ensure completeness
5. Provide detailed reasoning for each category's importance and weight
6. Note which specific documents contributed to each criterion

Return a JSON object with this structure:
{
  "criteria": [
    {
      "category": "Innovation & Technical Merit",
      "weight": 35,
      "requirements": [
        "Must demonstrate novel approach or significant technical advancement",
        "Technical feasibility must be clearly established with evidence",
        "Innovation must address identified market gap or problem"
      ],
      "sourceDocuments": ["application_template.docx", "scoring_rubric.docx"],
      "reasoning": "Innovation is emphasized across multiple documents as the primary differentiator. The application template dedicates 3 major sections to technical approach, while the scoring rubric allocates the highest point values to innovation criteria."
    }
  ]
}`;

  const response = await invokeClaude(prompt, 'Criteria cross-referencing');
  const result = JSON.parse(response);
  return result.criteria || [];
}

/**
 * Step 3: Identify conflicts with Claude's nuanced understanding
 */
async function identifyConflictsWithClaude(documentContexts: DocumentContext[], criteriaAnalysis: any[]) {
  const prompt = `You are reviewing funding assessment documents for conflicts, contradictions, and inconsistencies that could affect fair assessment. Use your analytical skills to identify subtle conflicts that might be missed.

UNIFIED CRITERIA ANALYSIS:
${JSON.stringify(criteriaAnalysis, null, 2)}

DOCUMENT CONTENTS FOR CONFLICT ANALYSIS:
${documentContexts.map(doc => `
═══ ${doc.filename} ═══
${doc.content.substring(0, 2500)}...
`).join('\n')}

CONFLICT ANALYSIS:
Look for:
1. Weight contradictions (different percentages for same criteria)
2. Requirement conflicts (contradictory or incompatible requirements)
3. Scoring method inconsistencies (points vs percentages vs pass/fail)
4. Threshold conflicts (different passing scores)
5. Eligibility contradictions
6. Timeline or process conflicts

For each conflict found, provide:
- Specific type of conflict
- Clear description of the contradiction
- Which documents are affected
- Recommended resolution with justification

Return JSON:
{
  "conflicts": [
    {
      "type": "weight_mismatch",
      "description": "Innovation weight varies: Application template suggests 40% emphasis based on section allocation, while scoring rubric explicitly states 30%",
      "affectedDocuments": ["application_template.docx", "scoring_rubric.docx"],
      "recommendation": "Use 40% weighting as the application template's section structure indicates innovation is the primary focus area, requiring proportional assessment weight"
    }
  ]
}`;

  const response = await invokeClaude(prompt, 'Conflict identification');
  const result = JSON.parse(response);
  return result.conflicts || [];
}

/**
 * Step 4: Synthesize framework with Claude's superior logical reasoning
 */
async function synthesizeFrameworkWithClaude(documentContexts: DocumentContext[], criteriaAnalysis: any[], conflicts: any[]) {
  const prompt = `You are creating the definitive assessment framework for this funding program. Synthesize all document analysis into a clear, actionable framework that resolves conflicts and provides consistent assessment guidance.

UNIFIED CRITERIA:
${JSON.stringify(criteriaAnalysis, null, 2)}

IDENTIFIED CONFLICTS:
${JSON.stringify(conflicts, null, 2)}

SYNTHESIS REQUIREMENTS:
1. Determine the optimal scoring method based on document evidence
2. Set appropriate passing threshold based on program requirements
3. Justify final weightings considering all document inputs and conflict resolutions
4. Create step-by-step assessment process that assessors can follow
5. Ensure framework is internally consistent and fair

Return JSON:
{
  "scoringMethod": "Points|Percentage|Pass/Fail",
  "passingThreshold": 75,
  "weightingJustification": "Detailed explanation of how final weights were determined, including conflict resolutions and rationale",
  "assessmentProcess": [
    "Step 1: Verify eligibility requirements against application",
    "Step 2: Assess Innovation & Technical Merit (35% weight)",
    "Step 3: Evaluate Financial Viability (25% weight)",
    "Step 4: Review Team Capability (20% weight)",
    "Step 5: Assess Market Potential (20% weight)",
    "Step 6: Calculate weighted score and provide structured feedback"
  ]
}`;

  const response = await invokeClaude(prompt, 'Framework synthesis');
  const result = JSON.parse(response);
  
  return {
    scoringMethod: result.scoringMethod || 'Percentage',
    passingThreshold: result.passingThreshold || 70,
    weightingJustification: result.weightingJustification || 'Weights determined through comprehensive document analysis',
    assessmentProcess: result.assessmentProcess || ['Review application against unified criteria']
  };
}

/**
 * Invoke Claude via Bedrock with proper error handling
 */
async function invokeClaude(prompt: string, taskDescription: string): Promise<string> {
  console.log(`🧠 Claude ${taskDescription}...`);

  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4000,
    temperature: 0.1, // Lower temperature for more consistent analytical reasoning
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0", // Latest Claude model
    body: JSON.stringify(requestBody),
    contentType: "application/json"
  });

  try {
    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (responseBody.content && responseBody.content[0]?.text) {
      console.log(`✅ Claude ${taskDescription} complete`);
      return responseBody.content[0].text;
    } else {
      throw new Error('Invalid response format from Claude');
    }
  } catch (error) {
    console.error(`❌ Claude ${taskDescription} failed:`, error);
    throw error;
  }
}

/**
 * Fallback to basic pattern-matching analysis if Claude is unavailable
 */
async function fallbackToBasicAnalysis(documentContexts: DocumentContext[]): Promise<ReasonedCriteriaAnalysis> {
  // Import and use the existing basic analysis functions
  const { analyzeSelectionCriteria } = await import('./server-document-analyzer');
  
  // Convert contexts back to File objects for the existing function
  const mockFiles = documentContexts.map(ctx => {
    const blob = new Blob([ctx.content], { type: 'text/plain' });
    return new File([blob], ctx.filename, { type: 'text/plain' });
  });
  
  const basicAnalysis = await analyzeSelectionCriteria(mockFiles);
  
  // Convert to ReasonedCriteriaAnalysis format
  return {
    documentRoles: documentContexts.map(ctx => ({
      filename: ctx.filename,
      identifiedRole: 'Assessment Document',
      purpose: 'Contains assessment criteria and requirements',
      keyContributions: ['Assessment criteria', 'Requirements']
    })),
    
    unifiedCriteria: basicAnalysis.categories.map((category, index) => ({
      category,
      weight: basicAnalysis.weightings[index]?.weight || 20,
      requirements: basicAnalysis.detectedCriteria.slice(index * 5, (index + 1) * 5),
      sourceDocuments: documentContexts.map(ctx => ctx.filename),
      reasoning: 'Extracted from document pattern analysis'
    })),
    
    conflictsIdentified: [],
    
    synthesizedFramework: {
      scoringMethod: basicAnalysis.scoringMethod,
      passingThreshold: 70,
      weightingJustification: 'Weights based on pattern analysis',
      assessmentProcess: ['Review application', 'Apply criteria', 'Generate score']
    },
    
    // Pass through basic analysis
    ...basicAnalysis
  };
}