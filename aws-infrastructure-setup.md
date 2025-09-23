# AWS Infrastructure Setup for Production Background Processing

## CRITICAL ISSUE
**Production funds are stuck at "Processing" because background job infrastructure is missing from AWS.**

## Root Cause Analysis
1. ✅ Fund creation API works (creates DB records, uploads to S3)
2. ✅ SQS messages are sent to queue
3. ❌ SQS queue doesn't exist in AWS production
4. ❌ Lambda function not deployed to process messages
5. ❌ No workers to complete background jobs

## Emergency Fix (Immediate)

### Step 1: Deploy Emergency Completion Endpoint
```bash
# Already created: /src/app/api/funds/[fundId]/force-complete/route.ts
# Will be deployed with next Amplify build
```

### Step 2: Use Emergency Endpoint
```bash
# For the stuck fund, make POST request to:
POST https://main.d2l8hlr3sei3te.amplifyapp.com/api/funds/{FUND_ID}/force-complete

# This will manually complete all stuck background jobs
```

## Production Infrastructure Deployment

### 1. Create SQS Queue
```bash
aws sqs create-queue \
  --queue-name nolia-document-processing \
  --region ap-southeast-2 \
  --attributes VisibilityTimeoutSeconds=300,MessageRetentionPeriod=1209600
```

### 2. Create IAM Role for Lambda
```bash
aws iam create-role \
  --role-name nolia-lambda-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name nolia-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
  --role-name nolia-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess

aws iam attach-role-policy \
  --role-name nolia-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name nolia-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSDataFullAccess
```

### 3. Deploy Lambda Function
```bash
# Upload the existing built package
aws lambda create-function \
  --function-name nolia-document-processor \
  --runtime nodejs18.x \
  --role arn:aws:iam::599065966827:role/nolia-lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://lambda-deploy/lambda-function.zip \
  --timeout 300 \
  --memory-size 512 \
  --region ap-southeast-2 \
  --environment Variables='{
    "DATABASE_URL":"postgresql://postgres:PASSWORD@nolia-funding-db.xxxxx.ap-southeast-2.rds.amazonaws.com:5432/postgres",
    "S3_BUCKET_DOCUMENTS":"nolia-funding-documents-ap-southeast-2-599065966827",
    "AWS_REGION":"ap-southeast-2"
  }'
```

### 4. Connect SQS to Lambda
```bash
# Get queue ARN
QUEUE_ARN=$(aws sqs get-queue-attributes \
  --queue-url https://sqs.ap-southeast-2.amazonaws.com/599065966827/nolia-document-processing \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

# Create event source mapping
aws lambda create-event-source-mapping \
  --event-source-arn $QUEUE_ARN \
  --function-name nolia-document-processor \
  --batch-size 10 \
  --region ap-southeast-2
```

### 5. Update Amplify Environment Variables
Add to AWS Amplify environment variables:
```bash
SQS_QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/599065966827/nolia-document-processing
```

## Testing the Fix

### 1. Test Queue Connection
```bash
# Send test message to queue
aws sqs send-message \
  --queue-url https://sqs.ap-southeast-2.amazonaws.com/599065966827/nolia-document-processing \
  --message-body '{"test": "message"}' \
  --region ap-southeast-2
```

### 2. Test Lambda Function
```bash
# Invoke Lambda directly
aws lambda invoke \
  --function-name nolia-document-processor \
  --payload '{
    "Records": [{
      "messageId": "test-123",
      "body": "{\"jobId\":\"test\",\"fundId\":\"test\"}"
    }]
  }' \
  response.json \
  --region ap-southeast-2
```

### 3. Create New Fund
- Try creating a new fund through the UI
- Should now process correctly with deployed infrastructure

## Monitoring

### CloudWatch Logs
```bash
# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/nolia-document-processor

# View recent logs
aws logs get-log-events \
  --log-group-name /aws/lambda/nolia-document-processor \
  --log-stream-name $(aws logs describe-log-streams \
    --log-group-name /aws/lambda/nolia-document-processor \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --query 'logStreams[0].logStreamName' \
    --output text)
```

### SQS Queue Monitoring
```bash
# Check queue attributes
aws sqs get-queue-attributes \
  --queue-url https://sqs.ap-southeast-2.amazonaws.com/599065966827/nolia-document-processing \
  --attribute-names All
```

## Security Notes

1. **Database Access**: Lambda needs VPC configuration if RDS is in private subnet
2. **IAM Permissions**: Use least privilege - current setup is overly permissive for demo
3. **Environment Variables**: Store sensitive data in AWS Systems Manager Parameter Store
4. **Encryption**: Enable SQS encryption at rest

## Next Steps

1. **Immediate**: Deploy emergency completion endpoint and use it for stuck fund
2. **Short-term**: Deploy SQS queue and Lambda function
3. **Long-term**: Add proper monitoring, alerting, and error handling
4. **Production**: Implement Infrastructure as Code (CloudFormation/CDK)

## Files Created/Modified

- `/src/app/api/funds/[fundId]/force-complete/route.ts` - Emergency completion endpoint
- `/lambda-deploy/lambda-function.zip` - Pre-built Lambda deployment package
- `/lambda-deploy/index.js` - Lambda function code

## Expected Environment Variables

Production Amplify should have:
```bash
DATABASE_URL=postgresql://postgres:PASSWORD@host:5432/postgres
S3_BUCKET_DOCUMENTS=nolia-funding-documents-ap-southeast-2-599065966827
SQS_QUEUE_URL=https://sqs.ap-southeast-2.amazonaws.com/599065966827/nolia-document-processing
AWS_REGION=ap-southeast-2
NOLIA_AWS_REGION=ap-southeast-2
```