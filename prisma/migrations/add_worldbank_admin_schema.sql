-- Migration: Add Worldbank-Admin document types and analysis fields
-- Date: 2025-10-16
-- Description: Extends schema to support worldbank-admin module separation from funding

-- Step 1: Add new document types to DocumentType enum
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'POLICY_DOCUMENT';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'PROCUREMENT_RULE';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'COMPLIANCE_STANDARD';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'PROCUREMENT_TEMPLATE';

-- Step 2: Add worldbank-admin analysis fields to funds table
ALTER TABLE "funds" ADD COLUMN IF NOT EXISTS "policyDocumentAnalysis" JSONB;
ALTER TABLE "funds" ADD COLUMN IF NOT EXISTS "procurementRuleAnalysis" JSONB;
ALTER TABLE "funds" ADD COLUMN IF NOT EXISTS "complianceStandardAnalysis" JSONB;
ALTER TABLE "funds" ADD COLUMN IF NOT EXISTS "procurementTemplateAnalysis" JSONB;

-- Migration complete!
-- Next steps:
-- 1. Deploy code changes for worldbank-admin processing pipeline
-- 2. Test with existing fund c27b0e1b (WORLDBANK_ADMIN module)
