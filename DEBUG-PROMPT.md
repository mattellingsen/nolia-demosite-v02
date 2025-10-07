# Expert System Debugging Prompt for RAG Pipeline Failure

## Context & Situation

You are debugging a production AWS Amplify Next.js application with a RAG (Retrieval-Augmented Generation) pipeline that is experiencing systematic failures. The application has been through multiple partial fixes that have not resolved the core issues, leading to technical debt and inconsistent behavior.

**Critical Constraint:** The business owner is extremely frustrated after hours of failed attempts. This is a make-or-break moment. You MUST be methodical, thorough, and avoid making claims until you have hard evidence.

## System Architecture

```
Frontend (Next.js/React)
  ↓ HTTPS
AWS Amplify Serverless Functions
  ↓
PostgreSQL (metadata) + S3 (documents) + SQS (jobs)
  ↓
Background Job Processor (Lambda-equivalent)
  ↓
AWS Bedrock (Claude 3.5 Sonnet + Titan Embeddings)
  ↓
OpenSearch (Vector Database)
```

**Technology Stack:**
- Framework: Next.js 14+ (App Router)
- Database: PostgreSQL via Prisma ORM
- Storage: AWS S3
- Queue: AWS SQS
- AI: AWS Bedrock (Claude 3.5 Sonnet, Titan Embeddings)
- Search: AWS OpenSearch
- Deployment: AWS Amplify (ap-southeast-2)
- Module: Procurement Admin (moduleType='PROCUREMENT_ADMIN')

## Current Observed Symptoms

### User-Reported Behavior (GROUND TRUTH)
1. **Upload Phase:** User creates knowledgebase "This one surely... but i've said that before" with 2 documents
2. **Status Page Shows:**
   ```
   FAILED
   Processing failed
   0%
   Error: fetch failed
   Processed 0 of 2 documents
   ```
3. **List Page Shows:** Status = "Draft"
4. **Inconsistency:** Status page says FAILED, list page says DRAFT

### Database Evidence
- Job Type: `RAG_PROCESSING` (and some `DOCUMENT_ANALYSIS`)
- Error Message: `"fetch failed"`
- Multiple job attempts: 12+ jobs created, all failing
- Pattern: Jobs fail within 10-40 seconds
- Progress: Always 0%, never processes documents
- One completed job shows old error: "The provided token has expired"

### Historical Context
**Previous Failed Fixes:**
1. Multiple attempts to fix AWS SSO credential expiry ("The provided token has expired")
2. Created centralized credential provider (`getAWSCredentials()`)
3. Updated 13+ AWS SDK client initializations
4. Added comprehensive debug logging
5. Deployed multiple times (commits: a1ba9e7, c6fa48f, 6158dfa, cb9085e, e63d8d5)
6. Current deployment: commit e63d8d5, deployed 07:28 UTC

**Evidence of Code Changes Working:**
- Error changed from "token has expired" to "fetch failed" → proves new code is running
- One job reached COMPLETED status → proves pipeline CAN work
- Manual brain assembly succeeded → proves individual components work

## Your Debugging Mission

### Phase 1: Complete System Audit (Evidence-Based)

**DO NOT make assumptions. DO NOT skip steps. DO NOT claim fixes without verification.**

#### 1.1 Code Flow Analysis
Map the EXACT execution path from user upload to job failure:

```
Step-by-step trace requirements:
1. Document upload endpoint → Which file? Which function?
2. Job creation → Where? What table? What initial status?
3. Job processing trigger → How is it invoked? Auto-poll? SQS? HTTP?
4. Job processor execution → Which file handles RAG_PROCESSING vs DOCUMENT_ANALYSIS?
5. Where does "fetch failed" originate? → Exact line number, exact fetch() call
6. What URL is being fetched? → Log the actual constructed URL
7. Why does fetch fail? → Timeout? 404? 500? Network?
8. After fetch fails, what happens? → Retry logic? Status update?
```

**Deliverable:** Complete execution flow diagram with file paths and line numbers.

#### 1.2 Job Type Confusion Analysis
There are TWO job types appearing:
- `DOCUMENT_ANALYSIS` (older jobs, some completed)
- `RAG_PROCESSING` (newer jobs, all failing)

**Questions to answer:**
1. Which job type should procurement-admin use?
2. Are both types being created? Why?
3. Is there a processor for BOTH types?
4. Is the job type mismatch causing fetch to wrong endpoint?
5. Check: Does create-async create one type but processor expects another?

**Deliverable:** Exact job type flow, showing where each type is created and processed.

#### 1.3 Fetch Failure Root Cause Analysis

The error "fetch failed" is too generic. Find:

```typescript
// Find EVERY fetch() call in the job processing pipeline
// For each fetch():
1. What URL is being constructed?
2. What are the inputs to URL construction?
3. Is the URL correct for this module type (PROCUREMENT_ADMIN)?
4. Does the target endpoint exist?
5. Does the target endpoint have correct route params?
6. Is there error handling around fetch?
7. What's the timeout? Is it too short for serverless cold starts?
8. Are there network/CORS/security issues?
```

**Specific files to audit:**
- `src/lib/background-job-service.ts` - Check for fetch() calls
- `src/app/api/jobs/process/route.ts` - Check job processing logic
- `src/app/api/jobs/trigger-pending/route.ts` - Check job triggering
- `src/app/api/procurement-base/create-async/route.ts` - Check job creation
- `src/app/api/procurement-brain/[baseId]/assemble/route.ts` - Check brain assembly

**Deliverable:** Exact location of fetch failure with stack trace evidence.

#### 1.4 Credential Verification

Even though error changed, verify credentials are ACTUALLY working:

```bash
# Check these EXACT patterns in ALL files:
1. Find all AWS SDK client initializations
2. Verify EACH uses: credentials: getAWSCredentials()
3. Check getAWSCredentials() is imported correctly
4. Verify NO files still use forceIAMRole()
5. Check environment variables are set in Amplify
```

**Files to check:**
- All files in `src/lib/*.ts`
- All files in `src/app/api/**/*.ts`
- All files in `src/utils/*.ts`

**Deliverable:** List of ANY file still using old credential pattern.

#### 1.5 Serverless Architecture Issues

Amplify serverless functions have constraints:

```
Constraints to check:
1. Function timeout limits (default: 10 seconds, max: 900 seconds)
2. Memory limits (default: 512MB)
3. Cold start times (can be 5-10 seconds)
4. Inter-function communication (fetch between functions = bad pattern)
5. Lambda concurrency limits
6. SQS vs direct invocation patterns
```

**Questions:**
1. Is fetch() timing out due to cold starts?
2. Should we use direct function calls instead of HTTP?
3. Is the job processor running in same Lambda as API routes?
4. Are there multiple Lambda functions fighting for resources?

**Deliverable:** Serverless architecture issues identified with solutions.

### Phase 2: Systematic Fix Strategy

**AFTER Phase 1 audit is complete, create a fix plan:**

#### 2.1 Fix Prioritization
Rank issues by:
1. **Blocking severity** - Does it prevent ANY processing?
2. **Scope** - Does it affect all modules or just PROCUREMENT_ADMIN?
3. **Complexity** - Can it be fixed in one file or requires architecture change?
4. **Risk** - Could the fix break other working parts?

#### 2.2 Fix Implementation Rules

**Critical Rules:**
1. ✅ Fix ONE issue at a time
2. ✅ Verify each fix with actual test (not assumption)
3. ✅ Use feature flags or conditionals to isolate changes
4. ✅ Add logging before and after each fix
5. ✅ Document what you changed and WHY
6. ❌ NO speculative fixes
7. ❌ NO "this should work" claims
8. ❌ NO batch changes without verification

#### 2.3 Testing Protocol

**For EACH fix:**

```
1. Make the code change
2. Commit with descriptive message explaining WHAT and WHY
3. Deploy to Amplify
4. Wait for deployment confirmation (check Amplify console)
5. Add verification logging to prove new code is running
6. Create test knowledgebase with 2 small documents
7. Monitor BOTH:
   - Browser console (frontend logs)
   - CloudWatch logs (backend logs)
8. Check database directly via API
9. Document EXACT behavior observed
10. Only mark as "fixed" if BOTH browser AND database show success
```

**Success Criteria:**
- Status page shows: COMPLETED, 100%, 2 of 2 documents processed
- List page shows: Status = ACTIVE (not DRAFT)
- No error messages in jobs table
- Brain assembled successfully
- Documents visible in database
- OpenSearch index created

### Phase 3: Deliverables

#### 3.1 Root Cause Report
```markdown
# Root Cause Analysis

## Primary Issue
[Exact description with file:line references]

## Contributing Factors
1. [Factor 1 with evidence]
2. [Factor 2 with evidence]
...

## Why Previous Fixes Failed
[Explain each failed fix attempt and what it missed]
```

#### 3.2 Fix Implementation Plan
```markdown
# Fix Plan

## Fix #1: [Name]
- **File:** path/to/file.ts
- **Line:** 123
- **Current Code:** ```typescript ... ```
- **New Code:** ```typescript ... ```
- **Why:** [Explanation]
- **Risk:** [What could break]
- **Verification:** [How to test]

## Fix #2: [Name]
...
```

#### 3.3 Test Evidence
```markdown
# Test Results

## Before Fix
- Browser: [Screenshot/description]
- Database: [API response]
- Logs: [Key error messages]

## After Fix
- Browser: [Screenshot/description]
- Database: [API response]
- Logs: [Success messages]
```

## Your Working Constraints

### Communication Rules
1. **Show, don't claim:** Provide evidence (API responses, log excerpts, code snippets)
2. **Admit uncertainty:** Say "I need to check" not "it should work"
3. **Ask before acting:** Especially for deletions, deployments, database changes
4. **Small steps:** Present one finding at a time, get confirmation before continuing
5. **User is ground truth:** If user sees different behavior than you, YOU are wrong

### Code Quality Standards
1. **No half-fixes:** Don't fix part of a problem and claim victory
2. **No copy-paste:** Don't replicate broken patterns from other modules
3. **No shortcuts:** Don't skip error handling "for now"
4. **No assumptions:** Don't assume Amplify, SQS, or any service works as expected

### Debugging Methodology
Follow the scientific method:
1. **Observe** - What EXACTLY is happening (not what should happen)
2. **Hypothesize** - Form testable theory about root cause
3. **Predict** - If theory is right, we should see X
4. **Test** - Create experiment to verify
5. **Analyze** - Did we see X? If not, theory is wrong
6. **Iterate** - Refine theory and test again

## Expected Output Format

Structure your response as:

```markdown
# Phase 1: System Audit Findings

## 1.1 Code Flow Analysis
[Detailed findings with file:line references]

## 1.2 Job Type Confusion
[Analysis with evidence]

## 1.3 Fetch Failure Analysis
[Root cause with exact error location]

## 1.4 Credential Verification
[Verification results]

## 1.5 Serverless Architecture
[Issues identified]

---

# Phase 2: Fix Strategy

## Critical Path Issues (MUST FIX)
1. [Issue with severity: BLOCKING]

## Secondary Issues (SHOULD FIX)
1. [Issue with severity: HIGH]

## Optimization Issues (NICE TO HAVE)
1. [Issue with severity: LOW]

---

# Phase 3: Recommended Next Steps

## Immediate Action Required
1. [Step 1 with exact command/file to change]
2. [Step 2 with verification method]

## Questions for User
1. [Question requiring user input/decision]
```

## Success Definition

You will have succeeded when:

1. ✅ User creates a procurement knowledgebase with 2 documents
2. ✅ Upload completes without errors
3. ✅ Status page shows: COMPLETED, 100%, 2 of 2 documents
4. ✅ List page shows: Status = ACTIVE
5. ✅ Database shows: 2 documents, 1 successful job, brain assembled
6. ✅ No "fetch failed" or credential errors
7. ✅ User confirms it works in their browser
8. ✅ System can repeat success with a second test

## Final Notes

- This is not about speed. This is about correctness.
- The user has lost trust due to repeated failures. Rebuild it with evidence.
- Every claim must be backed by proof (code snippet, API response, log excerpt).
- If you don't know something, say so and propose how to find out.
- The goal is a WORKING system, not a working explanation.

**BEGIN YOUR SYSTEMATIC AUDIT NOW.**
