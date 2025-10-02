# Production Token Expiration Fix - Comprehensive Report

## Executive Summary

**Problem:** Production document processing fails with "The provided token has expired" error, blocking the entire RAG pipeline for procurement base creation.

**Root Cause:** AWS SDK clients in module-level code were being initialized BEFORE `forceIAMRole()` was called, causing them to attempt SSO authentication instead of using IAM roles.

**Solution:** Add `forceIAMRole()` call at the top of all modules that create AWS SDK clients, ensuring it executes before any client initialization.

## 1. Root Cause Analysis

### The Issue Chain

1. **Build Environment Contamination**
   - AWS Amplify build process has SSO credentials in environment (`AWS_PROFILE`, `AWS_SDK_LOAD_CONFIG`)
   - These are from the build system, not intended for runtime use

2. **Module Import Order Problem**
   - Files like `database-s3.ts`, `aws-opensearch.ts`, and `aws-bedrock.ts` create AWS clients at module level
   - These modules get imported by various API routes
   - The AWS SDK clients were created BEFORE `forceIAMRole()` could clear the SSO environment variables

3. **Token Expiration**
   - The AWS SDK attempts to use the SSO profile from build time
   - SSO tokens expire after a short period
   - Production fails with "The provided token has expired"

### Affected Files (BEFORE Fix)

These files created AWS SDK clients WITHOUT calling `forceIAMRole()` first:

1. `/src/lib/database-s3.ts` - S3Client created at line 43
2. `/src/lib/aws-opensearch.ts` - OpenSearchClient created at line 5
3. `/src/lib/aws-bedrock.ts` - BedrockRuntimeClient created at line 5

## 2. Complete Fix Implementation

### Files Modified

#### 1. `/src/lib/database-s3.ts`
```typescript
// Added at top of file:
import { forceIAMRole } from './force-iam-role';

// CRITICAL: Force IAM role usage in production (prevents SSO errors)
// This MUST happen before any AWS SDK client initialization
forceIAMRole();

// Then S3Client initialization...
```

#### 2. `/src/lib/aws-opensearch.ts`
```typescript
// Added at top of file:
import { forceIAMRole } from './force-iam-role';

// CRITICAL: Force IAM role usage in production (prevents SSO errors)
// This MUST happen before any AWS SDK client initialization
forceIAMRole();

// Then OpenSearchClient initialization...
```

#### 3. `/src/lib/aws-bedrock.ts`
```typescript
// Added at top of file:
import { forceIAMRole } from './force-iam-role';

// CRITICAL: Force IAM role usage in production (prevents SSO errors)
// This MUST happen before any AWS SDK client initialization
forceIAMRole();

// Then BedrockRuntimeClient initialization...
```

### Files Already Correct

These files already had `forceIAMRole()` properly configured:

1. `/src/lib/claude-service.ts` - Calls forceIAMRole() at line 12
2. `/src/lib/sqs-service.ts` - Calls forceIAMRole() at line 8
3. `/src/lib/background-job-service.ts` - Calls forceIAMRole() in extractTextFromS3Document
4. `/src/app/api/jobs/process/route.ts` - Calls forceIAMRole() at line 11
5. `/src/app/api/procurement-base/create-async/route.ts` - Calls forceIAMRole() at line 12

## 3. Execution Path Map

### Document Processing Flow

```
1. User uploads documents via frontend
   ↓
2. POST /api/procurement-base/create-async
   → Imports database-s3.ts (NOW FIXED: calls forceIAMRole first)
   → Creates procurement base record
   → Uploads documents to S3
   → Creates DOCUMENT_ANALYSIS job
   ↓
3. Background job processor picks up job
   → /api/jobs/process (already had forceIAMRole)
   → Calls processDocumentAnalysisJob()
   → Calls processDocument() for each document
   ↓
4. processDocument downloads from S3
   → Uses s3Client from top of file (already protected by forceIAMRole)
   → Downloads document successfully
   ↓
5. Document text extraction
   → Uses server-document-analyzer.ts
   → Extracts text with mammoth/pdf-parse
   ↓
6. Claude AI analysis
   → background-job-service.ts calls analyzeDocument
   → Uses claude-service.ts (already had forceIAMRole)
   → Generates analysis
   ↓
7. RAG processing
   → Stores vectors in OpenSearch
   → Uses aws-opensearch.ts (NOW FIXED: calls forceIAMRole first)
```

## 4. Why Previous Fixes Failed

Previous attempts added `forceIAMRole()` to various route handlers and service methods, but missed the critical issue: **module-level initialization happens during import, before any function calls**.

Example of the problem:
```typescript
// When any file does: import { prisma } from './database-s3'
// The database-s3.ts file executes immediately, including:
const s3Client = new S3Client({...}); // This ran BEFORE forceIAMRole()
```

## 5. Verification Plan

### Local Testing
1. Run `node test-aws-clients.js` to verify all modules call forceIAMRole()
2. Check that SSO environment variables are cleared in production mode

### Production Testing
After deployment:

1. **Create a new procurement base with documents**
   - Should complete without token errors
   - Check job status shows COMPLETED

2. **Monitor logs for**:
   - "🔒 Forced IAM role usage in production" messages
   - No "token has expired" errors
   - Successful document processing messages

3. **Verify RAG pipeline**:
   - Documents processed successfully
   - Embeddings stored in OpenSearch
   - Knowledge base queryable

## 6. Critical Success Factors

✅ **ALL AWS SDK clients must be created AFTER forceIAMRole()**
- Module-level clients are the most critical
- Route-level clients should also call it for safety

✅ **forceIAMRole() must execute synchronously at module import**
- Cannot be in an async function
- Must be at top level of module

✅ **Environment detection must be correct**
- Only force IAM roles in production
- Allow explicit credentials in development

## 7. Preventive Measures

To prevent this issue in the future:

1. **Code Review Checklist**
   - Any new file creating AWS SDK clients MUST call forceIAMRole() first
   - Module-level client creation requires special attention

2. **Documentation**
   - Add comments to all AWS client initializations explaining the requirement
   - Update CLAUDE.md with this pattern

3. **Testing**
   - Add automated test to verify forceIAMRole() is called before AWS client creation
   - Include in CI/CD pipeline

## Conclusion

The fix addresses the root cause by ensuring IAM role authentication is forced BEFORE any AWS SDK client initialization. This prevents the SDK from attempting to use SSO credentials that may exist in the build environment.

**Status:** Ready for production deployment
**Risk:** Low - changes only affect credential resolution, not business logic
**Impact:** High - unblocks entire RAG pipeline for procurement module