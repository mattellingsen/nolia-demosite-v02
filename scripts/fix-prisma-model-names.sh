#!/bin/bash

# Fix all Prisma model name references after schema introspection
# Schema changed from PascalCase to snake_case: Fund -> funds, FundDocument -> fund_documents, BackgroundJob -> background_jobs

echo "🔧 Fixing Prisma model names in API routes..."

# Find and replace prisma.fund -> prisma.funds
find src/app/api -type f -name "*.ts" -exec sed -i '' 's/prisma\.fund\./prisma.funds./g' {} +

# Find and replace prisma.fundDocument -> prisma.fund_documents
find src/app/api -type f -name "*.ts" -exec sed -i '' 's/prisma\.fundDocument\./prisma.fund_documents./g' {} +

# Find and replace prisma.backgroundJob -> prisma.background_jobs
find src/app/api -type f -name "*.ts" -exec sed -i '' 's/prisma\.backgroundJob\./prisma.background_jobs./g' {} +

# Find and replace prisma.assessment -> prisma.assessments
find src/app/api -type f -name "*.ts" -exec sed -i '' 's/prisma\.assessment\./prisma.assessments./g' {} +

echo "✅ Fixed all Prisma model name references"
echo ""
echo "📊 Changes made:"
grep -r "prisma\.funds\." src/app/api --include="*.ts" | wc -l | xargs echo "  prisma.funds references:"
grep -r "prisma\.fund_documents\." src/app/api --include="*.ts" | wc -l | xargs echo "  prisma.fund_documents references:"
grep -r "prisma\.background_jobs\." src/app/api --include="*.ts" | wc -l | xargs echo "  prisma.background_jobs references:"
grep -r "prisma\.assessments\." src/app/api --include="*.ts" | wc -l | xargs echo "  prisma.assessments references:"
