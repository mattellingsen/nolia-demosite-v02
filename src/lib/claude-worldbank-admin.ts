/**
 * Claude AI Analysis Functions for Worldbank-Admin Module
 *
 * Purpose: Extract procurement rules, policies, and compliance requirements
 * from global procurement documents to build organization-wide knowledge base.
 *
 * Architecture: Uses same chunking/progress tracking as funding module,
 * but with procurement-focused prompts for worldbank-admin document types.
 */

import { callClaude } from './claude-service';

// ============================================================================
// POLICY_DOCUMENT Analysis
// ============================================================================

export async function analyzePolicyDocument(
  textContent: string,
  filename: string,
  updateProgress?: (current: number, total: number) => Promise<void>
): Promise<any> {
  console.log(`📋 Analyzing POLICY_DOCUMENT: ${filename} (${textContent.length} chars)`);

  const CHUNK_SIZE = 80000; // Claude context limit

  // Small document - process as single chunk
  if (textContent.length <= CHUNK_SIZE) {
    console.log(`📄 Processing ${filename} as single chunk`);
    return await analyzePolicyDocumentChunk(textContent, filename);
  }

  // Large document - chunk it
  console.log(`📦 Document too large, splitting into chunks of ${CHUNK_SIZE} chars`);
  const chunks: string[] = [];
  for (let i = 0; i < textContent.length; i += CHUNK_SIZE) {
    chunks.push(textContent.substring(i, i + CHUNK_SIZE));
  }

  console.log(`📦 Created ${chunks.length} chunks for ${filename}`);

  const chunkResults = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`📦 Processing chunk ${i + 1}/${chunks.length} for ${filename}`);

    // Update progress if callback provided
    if (updateProgress) {
      await updateProgress(i + 1, chunks.length);
    }

    const result = await analyzePolicyDocumentChunk(chunks[i], filename, i + 1, chunks.length);
    chunkResults.push(result);
  }

  // Combine chunk results
  return combinePolicyDocumentChunks(chunkResults, filename);
}

async function analyzePolicyDocumentChunk(
  textContent: string,
  filename: string,
  chunkNumber?: number,
  totalChunks?: number
): Promise<any> {
  const chunkInfo = chunkNumber ? ` (chunk ${chunkNumber}/${totalChunks})` : '';
  console.log(`🧠 Calling Claude for policy analysis${chunkInfo}: ${filename}`);

  const prompt = `You are analyzing a GLOBAL procurement policy document for an organization-wide knowledge base.

Document: ${filename}${chunkInfo}

Extract the following to build a reference knowledge base that will be used when evaluating project-specific procurement activities:

1. **Policy Rules**: What procurement rules are defined? Extract specific rules, their scope, and when they apply.

2. **Requirements**: What are the mandatory requirements for procurement activities? Include:
   - Documentation requirements
   - Approval requirements
   - Process requirements
   - Timeline requirements

3. **Compliance Checks**: What compliance criteria must be met? Include:
   - Legal/regulatory compliance
   - Internal policy compliance
   - Ethical standards
   - Conflict of interest rules

4. **Thresholds**: Extract any monetary or quantitative thresholds that trigger specific requirements:
   - Dollar amounts requiring different approval levels
   - Quantities requiring specific procedures
   - Time periods for various steps

5. **Procedures**: Standard procedures that apply organization-wide:
   - Step-by-step processes
   - Required forms/templates
   - Review/approval workflows

6. **Exceptions**: Any exceptions or special cases mentioned

7. **Key Terms**: Important definitions or terminology specific to procurement

Context: This analysis will be stored in a GLOBAL knowledge base and combined with project-specific knowledge during procurement assessment. Focus on extracting rules that can be referenced when evaluating whether a procurement action complies with organizational policy.

Return your analysis as a structured JSON object with the following format:
{
  "policyRules": [{"rule": "description", "scope": "when it applies", "category": "category"}],
  "requirements": [{"type": "requirement type", "description": "description", "mandatory": true/false}],
  "complianceChecks": [{"check": "description", "category": "category"}],
  "thresholds": [{"type": "threshold type", "value": "value", "triggerAction": "what it triggers"}],
  "procedures": [{"name": "procedure name", "steps": ["step1", "step2"]}],
  "exceptions": [{"exception": "description", "conditions": "when it applies"}],
  "keyTerms": [{"term": "term", "definition": "definition"}]
}

Document content:
${textContent}
`;

  const response = await callClaude({
    systemPrompt: 'You are an expert in procurement policy analysis. Extract structured procurement rules and requirements from policy documents.',
    userPrompt: prompt,
    temperature: 0.3,
  });

  // Parse JSON response
  try {
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Failed to parse Claude response as JSON:', error);
    return {
      policyRules: [],
      requirements: [],
      complianceChecks: [],
      thresholds: [],
      procedures: [],
      exceptions: [],
      keyTerms: [],
      rawResponse: response,
    };
  }
}

function combinePolicyDocumentChunks(chunkResults: any[], filename: string): any {
  console.log(`🔗 Combining ${chunkResults.length} chunks for ${filename}`);

  return {
    policyRules: chunkResults.flatMap((c) => c.policyRules || []),
    requirements: chunkResults.flatMap((c) => c.requirements || []),
    complianceChecks: chunkResults.flatMap((c) => c.complianceChecks || []),
    thresholds: chunkResults.flatMap((c) => c.thresholds || []),
    procedures: chunkResults.flatMap((c) => c.procedures || []),
    exceptions: chunkResults.flatMap((c) => c.exceptions || []),
    keyTerms: chunkResults.flatMap((c) => c.keyTerms || []),
    metadata: {
      filename,
      totalChunks: chunkResults.length,
      analysisMode: 'CLAUDE_AI_CHUNKED',
      documentType: 'POLICY_DOCUMENT',
    },
  };
}

// ============================================================================
// PROCUREMENT_RULE Analysis
// ============================================================================

export async function analyzeProcurementRuleDocument(
  textContent: string,
  filename: string,
  updateProgress?: (current: number, total: number) => Promise<void>
): Promise<any> {
  console.log(`📋 Analyzing PROCUREMENT_RULE: ${filename} (${textContent.length} chars)`);

  const CHUNK_SIZE = 80000;

  if (textContent.length <= CHUNK_SIZE) {
    return await analyzeProcurementRuleChunk(textContent, filename);
  }

  const chunks: string[] = [];
  for (let i = 0; i < textContent.length; i += CHUNK_SIZE) {
    chunks.push(textContent.substring(i, i + CHUNK_SIZE));
  }

  console.log(`📦 Created ${chunks.length} chunks for ${filename}`);

  const chunkResults = [];
  for (let i = 0; i < chunks.length; i++) {
    if (updateProgress) {
      await updateProgress(i + 1, chunks.length);
    }

    const result = await analyzeProcurementRuleChunk(chunks[i], filename, i + 1, chunks.length);
    chunkResults.push(result);
  }

  return combineProcurementRuleChunks(chunkResults, filename);
}

async function analyzeProcurementRuleChunk(
  textContent: string,
  filename: string,
  chunkNumber?: number,
  totalChunks?: number
): Promise<any> {
  const chunkInfo = chunkNumber ? ` (chunk ${chunkNumber}/${totalChunks})` : '';
  console.log(`🧠 Calling Claude for procurement rule analysis${chunkInfo}: ${filename}`);

  const prompt = `You are analyzing a procurement rule document for a GLOBAL knowledge base.

Document: ${filename}${chunkInfo}

Extract specific procurement rules, conditions, and requirements:

1. **Rules**: Specific procurement rules with clear conditions and actions
2. **Conditions**: When does each rule apply? (e.g., dollar amounts, project types, vendors)
3. **Actions Required**: What must be done when the rule applies?
4. **Prohibitions**: What is NOT allowed?
5. **Approval Requirements**: Who must approve what, and when?
6. **Documentation**: What documentation is required?

Return as structured JSON:
{
  "rules": [{"ruleId": "unique id", "title": "title", "description": "description", "conditions": ["condition1"], "actions": ["action1"], "severity": "mandatory|recommended|optional"}],
  "prohibitions": [{"what": "what is prohibited", "exceptions": "exceptions if any"}],
  "approvalRequirements": [{"trigger": "what triggers approval", "approver": "who approves", "timeline": "when"}],
  "documentationRequirements": [{"trigger": "when required", "documents": ["doc1", "doc2"]}]
}

Document content:
${textContent}
`;

  const response = await callClaude({
    systemPrompt: 'You are an expert in procurement rules and compliance. Extract actionable rules from procurement documents.',
    userPrompt: prompt,
    temperature: 0.3,
  });

  try {
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    return JSON.parse(cleanedResponse);
  } catch (error) {
    return {
      rules: [],
      prohibitions: [],
      approvalRequirements: [],
      documentationRequirements: [],
      rawResponse: response,
    };
  }
}

function combineProcurementRuleChunks(chunkResults: any[], filename: string): any {
  return {
    rules: chunkResults.flatMap((c) => c.rules || []),
    prohibitions: chunkResults.flatMap((c) => c.prohibitions || []),
    approvalRequirements: chunkResults.flatMap((c) => c.approvalRequirements || []),
    documentationRequirements: chunkResults.flatMap((c) => c.documentationRequirements || []),
    metadata: {
      filename,
      totalChunks: chunkResults.length,
      analysisMode: 'CLAUDE_AI_CHUNKED',
      documentType: 'PROCUREMENT_RULE',
    },
  };
}

// ============================================================================
// COMPLIANCE_STANDARD Analysis
// ============================================================================

export async function analyzeComplianceStandardDocument(
  textContent: string,
  filename: string,
  updateProgress?: (current: number, total: number) => Promise<void>
): Promise<any> {
  console.log(`📋 Analyzing COMPLIANCE_STANDARD: ${filename} (${textContent.length} chars)`);

  const CHUNK_SIZE = 80000;

  if (textContent.length <= CHUNK_SIZE) {
    return await analyzeComplianceStandardChunk(textContent, filename);
  }

  const chunks: string[] = [];
  for (let i = 0; i < textContent.length; i += CHUNK_SIZE) {
    chunks.push(textContent.substring(i, i + CHUNK_SIZE));
  }

  const chunkResults = [];
  for (let i = 0; i < chunks.length; i++) {
    if (updateProgress) {
      await updateProgress(i + 1, chunks.length);
    }

    const result = await analyzeComplianceStandardChunk(chunks[i], filename, i + 1, chunks.length);
    chunkResults.push(result);
  }

  return combineComplianceStandardChunks(chunkResults, filename);
}

async function analyzeComplianceStandardChunk(
  textContent: string,
  filename: string,
  chunkNumber?: number,
  totalChunks?: number
): Promise<any> {
  const chunkInfo = chunkNumber ? ` (chunk ${chunkNumber}/${totalChunks})` : '';
  console.log(`🧠 Calling Claude for compliance standard analysis${chunkInfo}: ${filename}`);

  const prompt = `You are analyzing a compliance standards document for procurement.

Document: ${filename}${chunkInfo}

Extract compliance standards, checklists, and requirements:

1. **Standards**: What standards must be met?
2. **Checklists**: Compliance checklists or verification steps
3. **Certifications**: Required certifications or attestations
4. **Audit Requirements**: What will be audited and how?
5. **Penalties**: Consequences of non-compliance

Return as JSON:
{
  "standards": [{"standardId": "id", "title": "title", "description": "description", "category": "category", "mandatory": true/false}],
  "checklists": [{"checklistName": "name", "items": [{"item": "description", "required": true/false}]}],
  "certifications": [{"certification": "what certification", "when": "when required", "who": "who provides"}],
  "auditRequirements": [{"what": "what is audited", "frequency": "how often", "by": "who audits"}],
  "penalties": [{"violation": "what violation", "penalty": "consequence"}]
}

Document content:
${textContent}
`;

  const response = await callClaude({
    systemPrompt: 'You are an expert in procurement compliance and audit requirements. Extract compliance standards from documents.',
    userPrompt: prompt,
    temperature: 0.3,
  });

  try {
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    return JSON.parse(cleanedResponse);
  } catch (error) {
    return {
      standards: [],
      checklists: [],
      certifications: [],
      auditRequirements: [],
      penalties: [],
      rawResponse: response,
    };
  }
}

function combineComplianceStandardChunks(chunkResults: any[], filename: string): any {
  return {
    standards: chunkResults.flatMap((c) => c.standards || []),
    checklists: chunkResults.flatMap((c) => c.checklists || []),
    certifications: chunkResults.flatMap((c) => c.certifications || []),
    auditRequirements: chunkResults.flatMap((c) => c.auditRequirements || []),
    penalties: chunkResults.flatMap((c) => c.penalties || []),
    metadata: {
      filename,
      totalChunks: chunkResults.length,
      analysisMode: 'CLAUDE_AI_CHUNKED',
      documentType: 'COMPLIANCE_STANDARD',
    },
  };
}

// ============================================================================
// PROCUREMENT_TEMPLATE Analysis
// ============================================================================

export async function analyzeProcurementTemplateDocument(
  textContent: string,
  filename: string
): Promise<any> {
  console.log(`📋 Analyzing PROCUREMENT_TEMPLATE: ${filename} (${textContent.length} chars)`);

  // Templates are usually smaller, process as single chunk
  console.log(`🧠 Calling Claude for procurement template analysis: ${filename}`);

  const prompt = `You are analyzing a procurement template document.

Document: ${filename}

Extract template structure, required fields, and placeholders:

1. **Template Type**: What kind of template is this? (e.g., evaluation form, bid request, contract)
2. **Sections**: Main sections of the template
3. **Required Fields**: Fields that must be filled in
4. **Placeholders**: Placeholders like [Organization Name], [Date], etc.
5. **Instructions**: Any instructions for using the template

Return as JSON:
{
  "templateType": "type",
  "sections": [{"sectionName": "name", "description": "description"}],
  "requiredFields": [{"fieldName": "name", "type": "text|number|date", "description": "description"}],
  "placeholders": [{"placeholder": "[Name]", "description": "what to replace with"}],
  "instructions": ["instruction1", "instruction2"],
  "rawTemplateContent": "preserve original template text here"
}

Document content:
${textContent}
`;

  const response = await callClaude({
    systemPrompt: 'You are an expert in procurement templates and forms. Extract template structure and requirements.',
    userPrompt: prompt,
    temperature: 0.3,
  });

  try {
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const parsed = JSON.parse(cleanedResponse);

    // Ensure raw template content is preserved
    if (!parsed.rawTemplateContent) {
      parsed.rawTemplateContent = textContent;
    }

    return {
      ...parsed,
      metadata: {
        filename,
        analysisMode: 'CLAUDE_AI',
        documentType: 'PROCUREMENT_TEMPLATE',
      },
    };
  } catch (error) {
    return {
      templateType: 'unknown',
      sections: [],
      requiredFields: [],
      placeholders: [],
      instructions: [],
      rawTemplateContent: textContent,
      rawResponse: response,
      metadata: {
        filename,
        analysisMode: 'CLAUDE_AI',
        documentType: 'PROCUREMENT_TEMPLATE',
      },
    };
  }
}
