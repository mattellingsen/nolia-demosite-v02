# How to View Amplify Function Logs

## Option 1: AWS Console (Recommended - Most Detailed)

1. **Go to AWS Console** → https://ap-southeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-southeast-2#logsV2:log-groups

2. **Find the log group for your API route:**
   - Look for: `/aws/lambda/nolia-demosite-v02-main-procurement-base-create-async`
   - Or search for: `nolia-demosite-v02` in the filter box

3. **Click on the log group** → **View log streams**

4. **Click on the most recent log stream** (top of the list, sorted by "Last Event Time")

5. **Look for your debug logs** with emoji prefixes:
   - 🔍 DEBUG: API Route called
   - 📦 DEBUG: Request body
   - 🔐 DEBUG: AWS credentials
   - 📄 DEBUG: File processing
   - ✅ Success or ❌ Error messages

## Option 2: AWS Amplify Console (Easier but Less Detail)

1. **Go to AWS Amplify Console** → https://ap-southeast-2.console.aws.amazon.com/amplify/home?region=ap-southeast-2#/

2. **Click on your app:** `nolia-demosite-v02`

3. **Click on "Hosting" → "main" branch**

4. **Scroll down to "Function logs"** (if available)

## Option 3: Using AWS CLI (For Quick Checks)

```bash
# Set your AWS profile
export AWS_PROFILE=springload-dev

# Get recent logs from the function
aws logs tail /aws/lambda/nolia-demosite-v02-main-procurement-base-create-async \
  --follow \
  --region ap-southeast-2 \
  --format short

# Or get logs from the last 10 minutes
aws logs tail /aws/lambda/nolia-demosite-v02-main-procurement-base-create-async \
  --since 10m \
  --region ap-southeast-2
```

## Option 4: Real-time Monitoring (Best for Active Testing)

```bash
# Terminal 1: Watch Amplify logs in real-time
AWS_PROFILE=springload-dev aws logs tail /aws/lambda/nolia-demosite-v02 \
  --follow \
  --region ap-southeast-2 \
  --format short

# Terminal 2: In another terminal, run your test
# (Upload documents in the browser)
```

## What to Look For

When you upload documents, you should see this sequence in the logs:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 DEBUG: API Route /api/procurement-base/create-async called
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DEBUG: Request body keys: [...]
📦 DEBUG: Request body structure: {...}
🔐 DEBUG: Checking AWS SDK credentials...
🔐 DEBUG: AWS credentials resolved successfully: {...}
📄 DEBUG: File properties: {...}
📤 DEBUG: Uploading file to S3...
✅ S3 upload successful
```

If you see an error, it will show:
```
❌ DEBUG: Failed to upload document
❌ DEBUG: Failed to resolve AWS credentials
```

## Quick Test Command

```bash
# One-liner to watch logs while you test
AWS_PROFILE=springload-dev aws logs tail /aws/lambda/nolia-demosite-v02-main \
  --follow \
  --region ap-southeast-2 \
  --filter-pattern "DEBUG" \
  --format short
```

## Notes

- Logs may take 10-30 seconds to appear in CloudWatch after the request
- Use `--follow` flag to watch logs in real-time
- The emoji prefixes make it easy to scan for our debug logs
- All our debug logs contain "DEBUG:" so you can filter for just those
