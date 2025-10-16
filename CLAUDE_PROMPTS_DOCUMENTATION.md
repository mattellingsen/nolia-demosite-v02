# COMPLETE LIST OF ALL CLAUDE AI PROMPTS IN NOLIA SYSTEM

## Overview

**2 Phases Use Claude AI:**
1. **DOCUMENT_ANALYSIS Phase** (when KB documents are uploaded)
2. **APPLICATION_ASSESSMENT Phase** (when applications are evaluated)

---

# PART 1: DOCUMENT ANALYSIS PROMPTS

**File:** `src/lib/background-job-service.ts`
**Used by:** `/worldbank-admin/setup/setup-worldbank-base` AND `/worldbank/setup/setup-new-project`
**Model:** Claude 3.5 Sonnet v2 (`anthropic.claude-3-5-sonnet-20241022-v2:0`)
**Purpose:** Analyze uploaded documents (procurement regulations, templates, etc.) to extract structure and content

---

## PROMPT 1: APPLICATION_FORM Analysis

**Location:** Lines 899-938
**Task:** `analyze_application_form`

```
Task: Application Form Analysis

Instructions:
Analyze this application form document to understand its structure and required fields.

Extract information about:
1. Required fields and their types
2. Section organization
3. Validation requirements
4. Field labels and descriptions

Content to analyze:
[DOCUMENT CONTENT HERE - up to 300,000 characters]

Output format:
Respond with valid JSON only:
{
  "status": "completed",
  "fields": [
    {
      "name": "field_name",
      "label": "Field Label",
      "type": "text|number|email|date|select",
      "required": true|false,
      "section": "section_name"
    }
  ],
  "sections": [
    {
      "name": "section_name",
      "title": "Section Title",
      "fields": ["field1", "field2"]
    }
  ]
}

Please provide a focused response for this specific task only.
```

**Parameters:**
- Max Tokens: 32,000
- Temperature: 0.3

---

## PROMPT 2: SELECTION_CRITERIA Analysis

**Location:** Lines 1001-1034
**Task:** `analyze_selection_criteria`

```
Task: Selection Criteria Analysis

Instructions:
Analyze this selection criteria document to extract assessment criteria and scoring guidelines.

Extract information about:
1. Assessment criteria categories
2. Scoring ranges and weights
3. Key evaluation indicators
4. Assessment instructions

Content to analyze:
[DOCUMENT CONTENT HERE - up to 300,000 characters]

Output format:
Respond with valid JSON only:
{
  "status": "completed",
  "criteria": [
    {
      "name": "criterion_name",
      "description": "What this criterion evaluates",
      "weight": 25,
      "maxScore": 100,
      "keyIndicators": ["indicator1", "indicator2"]
    }
  ],
  "overallInstructions": "General assessment guidelines"
}

Please provide a focused response for this specific task only.
```

**Parameters:**
- Max Tokens: 32,000
- Temperature: 0.3
- Timeout: 5 minutes

**Note:** For large documents (>300K chars), content is chunked and processed separately

---

## PROMPT 3: GOOD_EXAMPLES Analysis

**Location:** Lines 1090-1125
**Task:** `analyze_good_examples`

```
Task: Good Examples Analysis

Instructions:
Analyze these good example applications to identify success patterns.

Extract information about:
1. Common strengths in successful applications
2. Patterns in high-scoring responses
3. Key success factors
4. Quality indicators

Content to analyze:
[DOCUMENT CONTENT HERE]

Output format:
Respond with valid JSON only:
{
  "status": "completed",
  "successPatterns": {
    "commonStrengths": ["strength1", "strength2"],
    "keyIndicators": ["indicator1", "indicator2"],
    "averageScore": 85
  },
  "examples": [
    {
      "title": "Example Application",
      "strengths": ["what made this good"],
      "score": 90
    }
  ]
}

Please provide a focused response for this specific task only.
```

**Parameters:**
- Max Tokens: 32,000
- Temperature: 0.3
- Timeout: 5 minutes

---

## PROMPT 4: OUTPUT_TEMPLATES Analysis

**Location:** Lines 1150-1180
**Task:** `analyze_output_template`

```
Task: Output Template Analysis

Instructions:
Analyze this output template document to identify placeholders and structure.

Extract information about:
1. All placeholders in the format [placeholder] or {{placeholder}}
2. Template structure and sections
3. Required data fields
4. Format requirements

Do NOT include the full template content in your response - just analyze it.

Content to analyze:
[DOCUMENT CONTENT HERE]

Output format:
Respond with valid JSON only:
{
  "status": "completed",
  "useRawTemplate": true,
  "placeholders": ["[placeholder1]", "[placeholder2]"],
  "sections": ["Section 1", "Section 2"],
  "templateType": "assessment_report",
  "filename": "template_filename.docx"
}

Please provide a focused response for this specific task only.
```

**Parameters:**
- Max Tokens: 32,000
- Temperature: 0.1 (very precise for template analysis)
- Timeout: 5 minutes

**Special Note:** The system stores the full template content separately (`rawTemplateContent` field)

---

# PART 2: APPLICATION ASSESSMENT PROMPTS

**File:** `src/lib/aws-bedrock.ts`
**Used by:** `/worldbank/applications-upload` (when assessing submitted applications)
**Model:** Claude 3.5 Sonnet v2 (`anthropic.claude-3-5-sonnet-20241022-v2:0`)
**Purpose:** Assess funding applications against extracted criteria and provide scores/feedback

---

## Base Prompt Structure (Lines 129-143)

```
You are an expert funding application assessor. Analyze the following application against the provided criteria.

SELECTION CRITERIA:
[Criteria extracted from SELECTION_CRITERIA document]

GOOD EXAMPLES FOR REFERENCE:
[Examples extracted from GOOD_EXAMPLES document]

RELEVANT DOCUMENTS:
[Retrieved via RAG/OpenSearch from all uploaded documents]

APPLICATION TO ASSESS:
[Submitted application text]
```

---

## PROMPT 5: ELIGIBILITY Assessment

**Location:** Lines 147-161
**Assessment Type:** `eligibility`

```
TASK: Determine if this application meets the eligibility requirements.

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
}
```

**Parameters:**
- Max Tokens: 8,000
- Used for: Initial eligibility screening

---

## PROMPT 6: SCORING Assessment

**Location:** Lines 165-197
**Assessment Type:** `scoring`

```
TASK: Score this application against the selection criteria (0-100) AND fill the assessment template.

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
}
```

**Parameters:**
- Max Tokens: 8,000
- Used for: Final scoring and detailed assessment

---

## PROMPT 7: GUIDANCE Assessment

**Location:** Lines 200-214
**Assessment Type:** `guidance`

```
TASK: Provide guidance to improve this application before submission.

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
}
```

**Parameters:**
- Max Tokens: 8,000
- Used for: Pre-submission guidance to applicants

---

# SUMMARY FOR SYSTEM ARCHITECT

## Total Prompts: 7

### Document Analysis (4 prompts):
1. Application Form Analysis - Extract form structure and fields
2. Selection Criteria Analysis - Extract assessment criteria
3. Good Examples Analysis - Identify success patterns
4. Output Templates Analysis - Extract template placeholders

### Application Assessment (3 prompts):
5. Eligibility Assessment - Check if application meets requirements
6. Scoring Assessment - Score 0-100 + extract fields + fill template
7. Guidance Assessment - Provide improvement suggestions

## Key Characteristics:
- All prompts use Claude 3.5 Sonnet v2
- All return structured JSON
- Document analysis uses high token limits (32K) for large documents
- Application assessment uses moderate tokens (8K)
- Temperature varies: 0.1 (templates) to 0.3 (analysis)
- Timeouts: 5 minutes for document analysis
