#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 LAMBDA DEPLOYMENT WITH LOGGING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")"

echo "📦 Step 1: Install dependencies..."
npm install

echo "🔧 Step 2: Generate Prisma client..."
npx prisma generate --schema=schema.prisma

echo "📁 Step 3: Verify .prisma/client exists..."
if [ -d "node_modules/.prisma/client" ]; then
  echo "✅ Prisma client generated successfully"
  ls -la node_modules/.prisma/client/ | head -10
else
  echo "❌ ERROR: Prisma client not generated!"
  exit 1
fi

echo "📦 Step 4: Create deployment package..."
rm -f lambda-function.zip
zip -r lambda-function.zip index.js node_modules/ schema.prisma -x "*.git*" -x "*test*" -q
echo "✅ Created lambda-function.zip ($(du -h lambda-function.zip | cut -f1))"

echo "☁️ Step 5: Upload to S3 (package too large for direct upload)..."
S3_BUCKET="nolia-funding-documents-ap-southeast-2-599065966827"
S3_KEY="lambda/nolia-document-processor-$(date +%Y%m%d-%H%M%S).zip"

AWS_PROFILE=springload-dev aws s3 cp lambda-function.zip "s3://${S3_BUCKET}/${S3_KEY}" --region ap-southeast-2
echo "✅ Uploaded to s3://${S3_BUCKET}/${S3_KEY}"

echo "🚀 Step 6: Update Lambda to use S3 package..."
AWS_PROFILE=springload-dev aws lambda update-function-code \
  --function-name nolia-document-processor \
  --s3-bucket "${S3_BUCKET}" \
  --s3-key "${S3_KEY}" \
  --region ap-southeast-2 \
  --output json | jq -r '{FunctionName, LastModified, CodeSize, Runtime}'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ LAMBDA DEPLOYED SUCCESSFULLY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Next steps:"
echo "   1. Clear SQS queue: aws sqs purge-queue --queue-url https://sqs.ap-southeast-2.amazonaws.com/599065966827/nolia-document-processing --region ap-southeast-2 --profile springload-dev"
echo "   2. Create test base and watch logs: aws logs tail /aws/lambda/nolia-document-processor --region ap-southeast-2 --follow --profile springload-dev"
