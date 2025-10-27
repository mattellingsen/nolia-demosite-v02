# Localhost Testing Guide for Worldbank-Admin

## Why Test Locally?

- ✅ See errors immediately in terminal (no 5-minute deployment wait)
- ✅ Real-time console.log output
- ✅ Can use debugger and breakpoints
- ✅ Connects to SAME production database and S3
- ✅ Faster iteration cycles

## Prerequisites

- Node.js installed (v18+)
- `.env` file with production credentials already exists

## Step-by-Step Instructions

### 1. Install Dependencies (if not already done)

```bash
npm install
```

### 2. Verify Environment Variables

Check that `.env` file exists and has these required variables:

```bash
# Database
DATABASE_URL="postgresql://postgres:k77MC3bHjw8.XRdFtVqr@nolia-funding-db.c15dwvcrgeos.ap-southeast-2.rds.amazonaws.com:5432/postgres"

# AWS
AWS_REGION="ap-southeast-2"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
S3_BUCKET_DOCUMENTS="nolia-funding-documents-ap-southeast-2-599065966827"

# Other required vars
AUTH_SECRET="your-secret"
```

### 3. Start Development Server

```bash
npm run dev
```

You should see output like:
```
> next dev

  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - ready in 2.3s
```

### 4. Open Worldbank-Admin Setup Page

Navigate to:
```
http://localhost:3000/worldbank-admin/setup
```

### 5. Watch Terminal for Logs

When you upload documents, you'll see detailed logs in your terminal:

```
🚀 DEBUG: handleCreateBase() called
📦 Base data prepared: { name: 'Test Base', ... }
📤 About to send API request
📥 API response status: 200 OK
✅ DEBUG: API success response: { ... }
```

**If there are errors, you'll see them IMMEDIATELY:**

```
❌ ERROR: Failed to upload document: [exact error message]
Stack trace: [full stack trace]
```

### 6. Testing the Debug Endpoint

To get even MORE detailed logging, temporarily change the API endpoint in the frontend:

**File:** `src/app/worldbank-admin/setup/setup-worldbank-base/page.tsx`

**Line 164:** Change from:
```typescript
const response = await fetch('/api/worldbank-base/create-async', {
```

To:
```typescript
const response = await fetch('/api/worldbank-base/debug-upload', {
```

This will:
- Log every single step of the upload process
- Return full error details in the response
- Show exactly where failures occur

### 7. Stopping the Server

Press `Ctrl+C` in the terminal to stop the dev server.

## Limitations of Localhost Testing

**What DOES work locally:**
- ✅ Document upload to S3
- ✅ Database record creation
- ✅ All API endpoints
- ✅ Frontend pages and modals
- ✅ Error logging and debugging

**What DOESN'T work locally:**
- ❌ SQS job queue processing (requires AWS Lambda)
- ❌ Background job execution (runs in AWS)

**Solution:** For full end-to-end testing including job processing, you still need to deploy to staging. But you can debug 90% of issues locally first.

## Common Issues

### Port Already in Use

If you see `Error: listen EADDRINUSE: address already in use :::3000`:

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### Database Connection Errors

If you see database connection errors, verify:
1. `.env` file has correct `DATABASE_URL`
2. Your IP is whitelisted in AWS RDS security group
3. Database is running

### AWS Credentials Errors

If S3 upload fails with credentials errors:
1. Check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`
2. Verify credentials haven't expired
3. Check IAM permissions for S3 access

## Tips for Effective Local Testing

1. **Keep terminal visible** - Don't minimize it, you'll miss important logs
2. **Use browser console** - Frontend logs appear in browser DevTools
3. **Test one feature at a time** - Easier to isolate issues
4. **Clear browser cache** - If things behave strangely
5. **Restart dev server** - If .env changes aren't picked up

## Debugging Workflow

1. **Run locally** - See immediate errors
2. **Fix code** - Make changes
3. **Test again** - Refresh browser (Hot reload should work)
4. **Repeat** - Until issue is resolved
5. **Deploy to staging** - Only when working locally
6. **Test SQS jobs** - Verify background processing works

This workflow is **10x faster** than deploying to staging every time!
