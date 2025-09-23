# 🚀 NOLIA V2 DEPLOYMENT FIX PLAN

## STEP 1: COMMIT ALL CRITICAL CHANGES
```bash
# First, review all changes
git status

# Add all modified files
git add .

# Remove deleted file from tracking
git rm src/utils/claude-document-reasoner.ts

# Commit with clear message
git commit -m "Deploy V2 assessment system with 4-step fund creation

- Add V2 assessment routes and processors
- Implement deterministic template engine
- Add resilient assessment service with Bedrock integration
- Update fund creation to 4-step process
- Add test applications interface
- Fix AWS region configuration (ap-southeast-2)
- Remove deprecated claude-document-reasoner"

# Push to trigger AWS Amplify deployment
git push origin main
```

## STEP 2: VERIFY AWS AMPLIFY BUILD
1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/
2. Check build logs for any errors
3. Ensure environment variables are set:
   - `DATABASE_URL`
   - `OPENSEARCH_ENDPOINT`
   - `OPENSEARCH_USERNAME`
   - `OPENSEARCH_PASSWORD`
   - `OPENAI_API_KEY`
   - `NOLIA_AWS_REGION=ap-southeast-2`

## STEP 3: TEST DEPLOYED VERSION
Once deployment completes (usually 5-10 minutes):

### Test Fund Creation Flow:
1. Navigate to: https://main.d2l8hlr3sei3te.amplifyapp.com/funding/setup/setup-new-fund
2. Complete all 4 steps:
   - Step 1: Upload application form
   - Step 2: Upload selection criteria
   - Step 3: Upload good examples
   - Step 4: Upload output templates
3. Click "Create Fund" and verify it processes correctly

### Test V2 Assessment:
1. Navigate to: https://main.d2l8hlr3sei3te.amplifyapp.com/funding/upload-applications
2. Select a fund created above
3. Upload a test application
4. Verify AI assessment runs and produces results

## STEP 4: MONITOR FOR ISSUES
Check for errors in:
1. Browser console (F12)
2. Network tab for failed API calls
3. AWS CloudWatch logs for Lambda/API errors

## FILES TO COMMIT (CRITICAL):

### Modified Files (36):
```
.env.local
.env.production
claude.md
package-lock.json
package.json
prd.md
prisma/schema.prisma
src/app/api/analyze/criteria/route.ts
src/app/api/analyze/document/route.ts
src/app/api/analyze/good-examples/route.ts
src/app/api/brain/[fundId]/assemble/route.ts
src/app/api/debug-fund-steps/route.ts
src/app/api/documents/upload-async/route.ts
src/app/api/funds/[fundId]/job-status/route.ts
src/app/api/funds/[fundId]/route.ts
src/app/api/funds/create-async/route.ts
src/app/api/jobs/[jobId]/status/route.ts
src/app/api/jobs/process/route.ts
src/app/funding/setup/setup-new-fund/components/step-1-upload-form.tsx
src/app/funding/setup/setup-new-fund/components/step-2-selection-criteria.tsx
src/app/funding/setup/setup-new-fund/components/step-3-good-examples.tsx
src/app/funding/setup/setup-new-fund/components/step-4-output-templates.tsx
src/app/funding/setup/setup-new-fund/page.tsx
src/app/layout.tsx
src/app/setup-dashboard.tsx
src/components/base/buttons/button.tsx
src/lib/aws-bedrock.ts
src/lib/background-job-service.ts
src/lib/database-s3.ts
src/lib/rag-database.ts
src/lib/sqs-service.ts
src/utils/browser-document-analyzer.ts
src/utils/server-document-analyzer.ts
```

### New Files to Add (47 - only critical ones):
```
src/app/api/assess/
src/app/api/funds/check-name/
src/app/api/init/
src/app/api/system/
src/app/api/process/document-v2/
src/app/api/process/test-assessment-v2/
src/app/funding/test-applications/
src/app/funding/upload-applications/types/
src/lib/assessment-engine.ts
src/lib/background-processor.ts
src/lib/claude-service.ts
src/lib/deterministic-template-engine.ts
src/lib/template-engine.ts
src/lib/field-extractor.ts
src/lib/resilient-assessment-service.ts
src/lib/startup.ts
src/utils/document-field-extractor.ts
src/utils/template-processor.ts
```

## VERIFICATION CHECKLIST:

- [ ] All files committed and pushed
- [ ] AWS Amplify build succeeds
- [ ] Homepage loads at https://main.d2l8hlr3sei3te.amplifyapp.com
- [ ] Can navigate to /funding/setup/setup-new-fund
- [ ] Can complete 4-step fund creation
- [ ] Fund saves to database with status ACTIVE
- [ ] Can navigate to /funding/upload-applications
- [ ] Can select created fund from dropdown
- [ ] Can upload test application
- [ ] AI assessment runs without errors
- [ ] Results display with scores and recommendations

## ROLLBACK PLAN:
If deployment fails:
```bash
# Revert to last known good commit
git revert HEAD
git push origin main
```

## SUPPORT CONTACTS:
- AWS Amplify Issues: Check CloudWatch Logs
- Database Issues: Check RDS connection in ap-southeast-2
- AI Issues: Verify Bedrock permissions for Claude 3.5 Sonnet v2

---
*Generated: 2025-09-23*
*Status: URGENT - System out of sync for 2 weeks*