# AWS Local Development Guide

## Problem Solved
This guide solves the issue of AWS SSO credentials expiring every hour during local development, which previously required running `aws sso login` constantly.

## Solution Overview
We use a credential export script that:
1. Fetches SSO credentials once
2. Exports them as environment variables
3. Caches them for 3 hours (actual token lifetime is ~1 hour, but we cache the process)
4. Works transparently with all AWS SDK clients

## Quick Start

### Option 1: Use the npm script (Recommended)
```bash
npm run dev:aws
```
This will automatically export AWS credentials and start the dev server.

### Option 2: Manual setup
```bash
# Export credentials (valid for ~1 hour)
source ./scripts/export-aws-creds.sh

# Start dev server
npm run dev
```

### Option 3: Separate terminals
```bash
# Terminal 1: Export credentials
source ./scripts/export-aws-creds.sh

# Terminal 2: Use the same session
source /tmp/.aws-sso-env-springload-dev.sh
npm run dev
```

## How It Works

1. **Initial SSO Login**: The script checks if you have a valid SSO session
2. **Credential Export**: Fetches temporary credentials from the SSO session
3. **Environment Variables**: Sets AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN
4. **Cache**: Stores credentials in `/tmp/.aws-sso-env-springload-dev.sh` for reuse
5. **SDK Usage**: AWS SDK automatically uses these environment variables

## Credential Duration

- **SSO Login Session**: 12 hours (but rarely used directly)
- **Assumed Role Credentials**: ~1 hour (what we actually use)
- **Script Cache**: 3 hours (to avoid re-running aws configure commands)

When credentials expire, simply run `source ./scripts/export-aws-creds.sh` again.

## Testing Credentials

To verify your credentials are working:
```bash
# Test with AWS CLI
aws sts get-caller-identity

# Test with Node.js SDK
node test-aws-creds.js
```

## Troubleshooting

### "SSO session expired" error
```bash
# Re-run the export script
source ./scripts/export-aws-creds.sh
```

### "ExpiredToken" error from SDK
Your temporary credentials have expired (after ~1 hour). Re-export:
```bash
source ./scripts/export-aws-creds.sh
```

### npm run dev:aws doesn't work
The npm script might not work with `source`. Use manual setup instead:
```bash
source ./scripts/export-aws-creds.sh
npm run dev
```

## Why This Solution?

1. **No Manual Re-authentication**: Credentials refresh automatically when you run the script
2. **Works with All AWS Services**: S3, Bedrock, SQS, DynamoDB, etc.
3. **Transparent to Application**: No code changes needed
4. **Secure**: No long-lived credentials stored
5. **Developer Friendly**: Simple command to refresh

## Alternative Solutions Considered

1. **AWS_PROFILE with SSO**: Expires every hour, requires constant re-login
2. **IAM User Keys**: Security risk, not recommended
3. **Credential Process**: More complex, requires daemon process
4. **Docker with IAM Role**: Overkill for local development

## Files Created

- `./scripts/export-aws-creds.sh` - Main credential export script
- `./scripts/aws-sso-credential-helper.sh` - Alternative helper (for credential_process)
- `/tmp/.aws-sso-env-springload-dev.sh` - Cached credentials (auto-generated)

## Security Notes

- Credentials are temporary and expire after ~1 hour
- Cached credentials are stored in `/tmp` with user-only permissions
- No credentials are committed to the repository
- AWS_PROFILE is unset to prevent SDK from attempting SSO