import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ baseId: string }> }
) {
  try {
    const { baseId } = await params;

    if (!baseId) {
      return NextResponse.json(
        { error: 'Base ID is required' },
        { status: 400 }
      );
    }

    // Check if base has metadata from DOCUMENT_ANALYSIS
    const base = await prisma.funds.findUnique({
      where: { id: baseId },
      select: {
        id: true,
        name: true,
        policyDocumentAnalysis: true,
        procurementRuleAnalysis: true,
        complianceStandardAnalysis: true,
        procurementTemplateAnalysis: true,
      }
    });

    if (!base) {
      return NextResponse.json(
        { error: 'Worldbank base not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      baseId: base.id,
      baseName: base.name,
      metadata: {
        policyDocumentAnalysis: base.policyDocumentAnalysis !== null,
        procurementRuleAnalysis: base.procurementRuleAnalysis !== null,
        complianceStandardAnalysis: base.complianceStandardAnalysis !== null,
        procurementTemplateAnalysis: base.procurementTemplateAnalysis !== null,
      },
      hasPolicyAnalysis: base.policyDocumentAnalysis !== null,
      hasProcurementRule: base.procurementRuleAnalysis !== null,
      hasComplianceStandard: base.complianceStandardAnalysis !== null,
      hasProcurementTemplate: base.procurementTemplateAnalysis !== null,
    });

  } catch (error) {
    console.error('Error checking worldbank base metadata:', error);
    return NextResponse.json(
      {
        error: 'Failed to check metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
