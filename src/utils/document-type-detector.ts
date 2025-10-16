/**
 * Document Type Detection Utilities
 *
 * Determines appropriate DocumentType based on filename and module context.
 * Used during document upload to assign correct document type.
 */

import { DocumentType } from '@prisma/client';

/**
 * Determine worldbank-admin document type from filename
 *
 * Heuristics based on common naming patterns:
 * - "policy", "regulation" → POLICY_DOCUMENT
 * - "rule", "requirement" → PROCUREMENT_RULE
 * - "standard", "compliance" → COMPLIANCE_STANDARD
 * - "template", "form" → PROCUREMENT_TEMPLATE
 * - Default → POLICY_DOCUMENT (safest default for procurement docs)
 */
export function determineWorldbankAdminDocumentType(filename: string): DocumentType {
  const name = filename.toLowerCase();

  // Policy documents (regulations, policies, guidelines)
  if (
    name.includes('policy') ||
    name.includes('regulation') ||
    name.includes('guideline') ||
    name.includes('directive')
  ) {
    return 'POLICY_DOCUMENT';
  }

  // Procurement rules (rules, requirements, criteria)
  if (
    name.includes('rule') ||
    name.includes('requirement') ||
    name.includes('criteria') ||
    name.includes('threshold')
  ) {
    return 'PROCUREMENT_RULE';
  }

  // Compliance standards (standards, compliance, audit)
  if (
    name.includes('standard') ||
    name.includes('compliance') ||
    name.includes('audit') ||
    name.includes('certification')
  ) {
    return 'COMPLIANCE_STANDARD';
  }

  // Templates (templates, forms, formats)
  if (
    name.includes('template') ||
    name.includes('form') ||
    name.includes('format') ||
    name.includes('sample')
  ) {
    return 'PROCUREMENT_TEMPLATE';
  }

  // Default: Treat as policy document (most common and safest default)
  console.log(`ℹ️ Could not determine specific document type for "${filename}", defaulting to POLICY_DOCUMENT`);
  return 'POLICY_DOCUMENT';
}

/**
 * Map worldbank-admin file categories to document types
 *
 * Based on the upload UI categories:
 * - policyFiles → POLICY_DOCUMENT
 * - complianceFiles → COMPLIANCE_STANDARD
 * - templateFiles → PROCUREMENT_TEMPLATE
 * - governanceFiles → PROCUREMENT_RULE
 */
export function mapCategoryToDocumentType(category: 'policy' | 'compliance' | 'template' | 'governance'): DocumentType {
  switch (category) {
    case 'policy':
      return 'POLICY_DOCUMENT';
    case 'compliance':
      return 'COMPLIANCE_STANDARD';
    case 'template':
      return 'PROCUREMENT_TEMPLATE';
    case 'governance':
      return 'PROCUREMENT_RULE';
    default:
      return 'POLICY_DOCUMENT';
  }
}
