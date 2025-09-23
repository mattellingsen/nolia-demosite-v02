## Systematic Debugging Approach for Document Upload Pipeline

### 1. Initial Information Gathering

**Before touching any code:**
- **Reproduce the issue consistently** - Get exact steps, file types/sizes that fail, success/failure rates
- **Define "working" vs "broken"** - What specific behavior indicates the bug? Timeout? Error message? Silent failure? Partial processing?
- **Collect failure patterns** - Time of day? Specific file characteristics? User-specific? Region-specific?
- **Check recent changes** - Review deployments in the last 2 weeks, infrastructure changes, dependency updates

### 2. End-to-End Tracing Strategy

**Set up correlation tracking:**
```javascript
// Generate a unique trace ID at upload initiation
const traceId = `trace-${Date.now()}-${crypto.randomUUID()}`;
// Pass this through X-Correlation-Id headers through the entire pipeline
```

**Enable comprehensive logging at each stage with this trace ID:**
- Browser: Console logs with network timing
- API Gateway: Access logs, execution logs, integration request/response logs
- Lambda functions: CloudWatch logs with DEBUG level
- S3: Server access logging, CloudTrail events
- SQS: Message attributes, DLQ configuration
- Step Functions: Execution history, state transitions
- DynamoDB: Operation logs, capacity metrics

### 3. Component-by-Component Verification

**Work backwards from the symptom:**

#### A. DynamoDB (Final Stage)
- Query for recent document records - are they partial? Missing? Malformed?
- Check for capacity throttling, hot partitions
- Verify IAM permissions for Lambda execution role
- Review item size limits (400KB), attribute limits

#### B. Bedrock/Claude API Integration
- Check API quotas and rate limits
- Verify API key/credentials are valid and not expired
- Test with minimal payload directly to API
- Review timeout configurations (API Gateway: 30s, Lambda: up to 15m)
- Monitor for specific error codes (429 rate limit, 503 service unavailable)

#### C. Processing Lambda
- Check CloudWatch for errors, timeouts, memory issues
- Verify environment variables are set correctly
- Test handler function with sample S3 event locally
- Review concurrent execution limits
- Check Lambda Layer dependencies and versions
- Verify VPC configuration if applicable

#### D. SQS/Step Functions
- Check Dead Letter Queue for failed messages
- Verify message visibility timeout > Lambda execution time
- Review Step Function state machine definition
- Check for state transition errors
- Verify retry/error handling configuration
- Monitor queue depth and age of oldest message

#### E. S3 Operations
- Verify bucket policies and ACLs
- Check for lifecycle policies that might affect uploads
- Test S3 event notifications are triggering
- Verify object metadata is preserved
- Check for S3 Transfer Acceleration issues if enabled
- Review bucket versioning/replication settings

#### F. Initial Lambda
- Verify multipart upload handling for large files
- Check pre-signed URL generation and expiration
- Review CORS configuration
- Test Lambda memory allocation for file processing
- Verify S3 write permissions

#### G. API Gateway
- Check throttling limits (10,000 requests/second by default)
- Verify integration timeout (29 seconds max)
- Review request/response transformations
- Check API key/usage plan quotas if applicable
- Verify CORS headers for browser requests

#### H. Browser Upload
- Check network inspector for failed requests
- Verify file size vs API Gateway payload limits (10MB)
- Test with different browsers/devices
- Review client-side retry logic
- Check for CORS errors

### 4. Data Flow Validation

**Create test documents with known content:**
```python
# Create test file with checksum
test_content = f"TEST-{timestamp}-{uuid}"
checksum = hashlib.sha256(test_content.encode()).hexdigest()
# Track this through each stage
```

**Verify at each stage:**
- File integrity (checksum validation)
- Metadata preservation
- Content transformation accuracy
- Processing timestamps

### 5. Performance and Scale Testing

**Identify bottlenecks:**
- Lambda cold start frequency
- API rate limiting
- DynamoDB write capacity
- SQS polling efficiency
- Network latency between components

**Load test with production-like volume:**
```bash
# Use artillery or similar tool
artillery run load-test-config.yml --target $API_ENDPOINT
```

### 6. Critical Checkpoints

**Must verify:**
- [ ] IAM roles have necessary permissions at each stage
- [ ] Security groups/NACLs allow required traffic
- [ ] Secrets/credentials are not expired
- [ ] Service quotas are not exceeded
- [ ] No circular dependencies in Step Functions
- [ ] Error handling doesn't swallow exceptions
- [ ] Timeouts are appropriately cascaded (API GW < Lambda < SQS visibility)
- [ ] Idempotency is maintained for retries

### 7. Debugging Tools and Commands

```bash
# Monitor Lambda logs in real-time
aws logs tail /aws/lambda/function-name --follow --filter-pattern "ERROR"

# Check SQS queue depth
aws sqs get-queue-attributes --queue-url $QUEUE_URL --attribute-names All

# Inspect Step Function execution
aws stepfunctions describe-execution --execution-arn $EXECUTION_ARN

# Test Lambda with sample event
aws lambda invoke --function-name $FUNCTION_NAME --payload file://test-event.json output.json

# Check API Gateway logs
aws logs get-log-events --log-group-name "API-Gateway-Execution-Logs" --log-stream-name $STREAM
```

### 8. Fix Validation Protocol

Once you identify the issue:

1. **Write a failing test that reproduces the bug**
2. **Implement the fix in a feature branch**
3. **Test with the original failure case**
4. **Test edge cases:** empty files, max size files, special characters, concurrent uploads
5. **Load test the fix**
6. **Deploy to staging and run integration tests**
7. **Canary deployment to production (5% → 25% → 50% → 100%)**
8. **Monitor error rates, latencies, and success metrics for 24 hours**
9. **Document the root cause and fix in your runbook**

### 9. Post-Fix Monitoring

Set up alerts for:
- Error rate > 1% over 5 minutes
- P95 latency > baseline + 20%
- DLQ depth > 0
- Lambda throttling or errors
- API Gateway 4xx/5xx rates

### Key Principle: Binary Search Debugging

If initial investigation doesn't reveal the issue, use binary search:
1. Add a "circuit breaker" test in the middle of the pipeline
2. If it fails before the breaker → focus on first half
3. If it fails after the breaker → focus on second half
4. Repeat until you isolate the failing component

Remember: The bug is most likely in the last thing that changed, but verify assumptions systematically. Don't assume - measure and validate.