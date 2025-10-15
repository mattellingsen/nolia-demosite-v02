# Lambda Timeout Configuration for Large Document Processing

## Overview

This document explains the Lambda timeout configuration for processing large documents (up to 1,300 pages / 292K characters) in the WorldBank Admin module. AWS Lambda functions have a maximum timeout of **15 minutes (900 seconds)**.

## Current Architecture

The application runs on **AWS Amplify** with Next.js, which deploys API routes as Lambda functions:
- **Function Name Pattern:** `amplify-{app-id}-{branch}-nextjs-server-handler`
- **Example:** `amplify-d2l8hlr3sei3te-staging-nextjs-server-handler`
- **Region:** ap-southeast-2 (Sydney)

## Timeout Requirements

### Target Processing Time
- **Small documents (<30K chars):** 30-120 seconds
- **Large documents (30K-300K chars):** 8-12 minutes with chunking
- **1,300-page document (292K chars):** ~12 minutes
- **Safety margin:** Target 12 minutes to stay under 15-minute Lambda limit

### Chunking Implementation
To stay within Lambda limits, large documents are processed in chunks:
- **Chunk size:** 30,000 characters
- **Example:** 292K document = ~10 chunks
- **Processing:** Sequential with progress tracking
- **Retry logic:** 3 attempts per chunk (5s, 10s, 15s exponential backoff)

## How to Verify Current Timeout Setting

### Option 1: AWS Console (Recommended)
1. Navigate to: https://ap-southeast-2.console.aws.amazon.com/lambda/home?region=ap-southeast-2#/functions
2. Search for: `amplify-d2l8hlr3sei3te-staging-nextjs-server-handler`
3. Click on the function name
4. Go to: **Configuration** → **General configuration**
5. Check: **Timeout** value (should be 900 seconds / 15 minutes for Amplify)

### Option 2: AWS CLI
```bash
# Set AWS profile
source ./scripts/export-aws-creds.sh springload-dev

# Get Lambda function configuration
aws lambda get-function-configuration \
  --function-name amplify-d2l8hlr3sei3te-staging-nextjs-server-handler \
  --region ap-southeast-2 \
  --query '{Timeout:Timeout,Memory:MemorySize,Runtime:Runtime}' \
  --output table
```

**Expected Output:**
```
-------------------------------------
|  GetFunctionConfiguration          |
+----------+--------+----------------+
| Memory   | Runtime| Timeout        |
+----------+--------+----------------+
| 3008     | nodejs20.x| 900       |
+----------+--------+----------------+
```

## Amplify Default Timeout

AWS Amplify automatically sets Lambda timeout to **900 seconds (15 minutes)** for Next.js API routes. This is the maximum allowed and cannot be increased further.

**Note:** Amplify manages Lambda configuration automatically. Manual changes via AWS Console or CLI may be overwritten on next deployment.

## Monitoring Processing Time

### CloudWatch Logs
View processing time logs in CloudWatch:

```bash
# Tail logs for recent executions
source ./scripts/export-aws-creds.sh springload-dev

aws logs tail /aws/lambda/amplify-d2l8hlr3sei3te-staging-nextjs-server-handler \
  --follow \
  --since 1h \
  --region ap-southeast-2 \
  --filter-pattern "Processing time"
```

**Example Log Output:**
```
⏱️ Processing document: WorldBank-Selection-Criteria.pdf (SELECTION_CRITERIA) - Start time: 2025-01-15T12:00:00.000Z
📊 Chunk progress: 1/10 (10%)
📊 Chunk progress: 2/10 (20%)
...
📊 Chunk progress: 10/10 (100%)
⏱️ Completed processing WorldBank-Selection-Criteria.pdf: SELECTION_CRITERIA
⏱️ Processing time: 720.45s (12.01 minutes)
```

### Timeout Warning Threshold
- **Green:** < 10 minutes (600s) - Safe
- **Yellow:** 10-13 minutes (600-780s) - Monitor
- **Red:** > 13 minutes (780s) - Risk of timeout

## What Happens on Timeout

If Lambda execution exceeds 15 minutes:
1. **Lambda terminates immediately** - No graceful shutdown
2. **HTTP 502/504 error** returned to caller
3. **Job status remains "PROCESSING"** in database (stuck state)
4. **Partial results lost** - No rollback

### Recovery from Timeout
1. Check job status in database:
   ```sql
   SELECT id, status, progress, "processedDocuments", "errorMessage"
   FROM background_jobs
   WHERE status = 'PROCESSING' AND "updatedAt" < NOW() - INTERVAL '15 minutes';
   ```

2. Retry the failed job (will resume from where it left off)

## Optimization Strategies

### Current Implementation (Completed)
- ✅ **Chunking:** Split large documents into 30K character segments
- ✅ **Progress tracking:** Update database after each chunk
- ✅ **Retry logic:** 3 attempts per chunk with exponential backoff
- ✅ **Timing logs:** Monitor execution time in real-time

### Future Optimizations (If Needed)
- **Increase chunk size:** Test with 50K character chunks (faster but more memory)
- **Parallel processing:** Process multiple chunks concurrently (requires careful design)
- **Async processing:** Move to SQS + long-running Lambda/ECS (architectural change)

## Testing Large Documents

### Test Document Characteristics
- **Test file:** WorldBank-Selection-Criteria.pdf (139 pages, 292K chars)
- **Expected chunks:** ~10 chunks at 30K each
- **Expected time:** 10-12 minutes
- **Expected progress:** 10%, 20%, 30%, ... 100% (logged every chunk)

### How to Test
1. Upload test document via WorldBank Admin interface
2. Monitor CloudWatch logs in real-time:
   ```bash
   aws logs tail /aws/lambda/amplify-d2l8hlr3sei3te-staging-nextjs-server-handler \
     --follow \
     --region ap-southeast-2 \
     --filter-pattern "⏱️ Processing"
   ```
3. Verify progress tracking in database metadata:
   ```sql
   SELECT metadata->'chunkProgress' FROM background_jobs WHERE id = 'job-id';
   ```

## Troubleshooting

### Problem: Job stuck at 50% for >5 minutes
**Likely cause:** Chunk analysis failed, retry logic kicked in
**Solution:** Check logs for error messages, wait for retries to complete (up to 30s delay)

### Problem: Processing time >13 minutes
**Likely cause:** Document larger than expected, or Claude API slow
**Solution:**
1. Check document size: Should be <300K chars
2. Reduce chunk size to 20K (more chunks but faster per chunk)
3. Check Claude API latency in CloudWatch metrics

### Problem: Lambda timeout (15 min exceeded)
**Likely cause:** Document too large or API extremely slow
**Solution:**
1. Check document size - may need async processing architecture
2. Implement SQS-based processing for documents >300K chars
3. Contact DevOps team for architectural review

## Related Documentation

- [Chunking Implementation](../src/lib/chunker.ts) - Core chunking logic
- [Background Job Service](../src/lib/background-job-service.ts) - Document analysis with chunking
- [Processing Route](../src/app/api/jobs/process/route.ts) - API endpoint with progress tracking

## Support

For questions or issues:
1. Check CloudWatch logs first
2. Review database job metadata
3. Contact DevOps team with:
   - Job ID
   - Document filename and size
   - CloudWatch log timestamps
   - Error messages (if any)
