-- Add POLICY_DOCUMENT to DocumentType enum for worldbank-admin module
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'POLICY_DOCUMENT';
