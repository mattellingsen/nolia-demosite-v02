# AWS Credential Pollution Analysis Report

## Executive Summary
**Problem:** Jobs stuck at "PENDING 0%" with no SQS messages being sent
**Root Cause:** `fromInstanceMetadata()` with 1000ms timeout is failing in Amplify Lambda environment
**Solution:** Revert to working approach or use appropriate credential provider

## Execution Context Analysis

### 1. API Routes (Lambda Functions via Amplify)
- **Environment:** AWS Lambda functions deployed by Amplify
- **Credential Source:** Lambda Execution Role (via container metadata service)
- **Code Location:** `/src/app/api/*/route.ts` files
- **AWS Services Used:** S3, SQS, Bedrock, OpenSearch

### 2. Background Processing
- **Environment:** SAME Lambda function (not separate)
- **Trigger:** Direct function call from API route (NOT SQS-triggered)
- **Code Location:** `BackgroundJobService.processNextJob()`
- **AWS Services Used:** S3, Bedrock, Textract, OpenSearch

## Critical Discovery

### Working Approach (commit c3818d2)
```typescript
// Production
return undefined; // Let SDK use default chain
```
- SDK automatically detects Lambda execution role
- Works in Amplify environment

### Current Broken Approach (commit 78f4c1f)
```typescript
// Production
return fromInstanceMetadata({
  timeout: 1000,    // TOO SHORT!
  maxRetries: 3
});
```

## Why fromInstanceMetadata() Fails

1. **Wrong Metadata Service:**
   - `fromInstanceMetadata()` is for EC2 instances (169.254.169.254)
   - Lambda uses container metadata service (different endpoint)
   - Amplify Lambda functions need `fromContainerMetadata()` or default chain

2. **Timeout Too Short:**
   - 1000ms timeout insufficient for metadata service in cold starts
   - SQS client initialization times out
   - Results in silent failure (no error thrown)

3. **Silent Failure Pattern:**
   - SQS send wrapped in try/catch that logs but doesn't fail
   - Job created in database as PENDING
   - No SQS message sent = no processing triggered
   - Job stays at PENDING 0% forever

## Evidence from Code

### SQS Service (lines 195-198)
```typescript
} catch (sqsError) {
  console.error(`Failed to send SQS message for job ${job.id}:`, sqsError);
  // Don't fail the transaction - the background processor can pick up pending jobs
}
```
**Problem:** Error is caught and logged but transaction succeeds, creating zombie jobs

### Background Trigger (lines 117-127)
```typescript
if (process.env.NODE_ENV === 'production') {
  import('./background-job-service').then(({ BackgroundJobService }) => {
    BackgroundJobService.processNextJob()
      .then(() => console.log('✅ Successfully triggered'))
      .catch((err: Error) => console.error('❌ Failed:', err));
  }).catch((err: Error) => console.error('❌ Failed to import:', err));
}
```
**Problem:** If SQS send fails, this in-process trigger is the only hope, but it may also fail with same credential issue

## The Real Issue Chain

1. Amplify sets expired build credentials in env vars
2. `fromInstanceMetadata()` used to bypass env vars
3. But `fromInstanceMetadata()` wrong for Lambda environment
4. SQS client creation fails/times out
5. Error caught silently, job created as PENDING
6. No SQS message sent
7. Background processor never triggered
8. Job stuck at PENDING 0% forever

## Solution Options

### Option 1: Revert to Working Approach (RECOMMENDED)
```typescript
export function getAWSCredentials(): AwsCredentialIdentityProvider | undefined {
  if (process.env.NODE_ENV === 'production') {
    // Delete polluted env vars first
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;

    // Let SDK use default chain (will find Lambda role)
    return undefined;
  }
  // ... development logic
}
```

### Option 2: Use Correct Provider for Lambda
```typescript
export function getAWSCredentials(): AwsCredentialIdentityProvider | undefined {
  if (process.env.NODE_ENV === 'production') {
    // Use container metadata for Lambda (not instance metadata)
    return fromContainerMetadata({
      timeout: 5000,  // Longer timeout for cold starts
      maxRetries: 3
    });
  }
  // ... development logic
}
```

### Option 3: Custom Chain Without Env Vars
```typescript
export function getAWSCredentials(): AwsCredentialIdentityProvider | undefined {
  if (process.env.NODE_ENV === 'production') {
    // Custom chain that skips env vars
    return chain(
      fromContainerMetadata({ timeout: 5000 }),
      fromInstanceMetadata({ timeout: 5000 })
    );
  }
  // ... development logic
}
```

## Verification Steps

1. Check CloudWatch logs for "Failed to send SQS message"
2. Query database for PENDING jobs with no completedAt
3. Check SQS queue for message count (should be 0 if broken)
4. Look for timeout errors in Lambda logs

## Recommended Fix

1. **Immediate:** Revert to Option 1 (delete env vars + return undefined)
2. **Test:** Create a fund with documents, verify job progresses past 0%
3. **Monitor:** Check CloudWatch for any credential errors
4. **Long-term:** Consider using IAM roles without any env var pollution

## Key Insight

The Amplify build process pollutes environment variables with expired credentials. The SDK's default credential chain checks env vars FIRST. We must either:
1. Delete the env vars and use default chain
2. Use a provider that explicitly skips env vars
3. Use the correct metadata service for Lambda environment

The current `fromInstanceMetadata()` approach fails because it's the wrong service for Lambda and the timeout is too short.