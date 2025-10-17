import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;
    
    // Check if fund exists and has required analysis data
    const existingFund = await prisma.funds.findUnique({
      where: { id: fundId },
      include: {
        fund_documents: true
      }
    });
    
    if (!existingFund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      );
    }

    // Validate fund has all required data for activation
    if (!existingFund.applicationFormAnalysis || 
        !existingFund.selectionCriteriaAnalysis || 
        !existingFund.goodExamplesAnalysis) {
      return NextResponse.json(
        { error: 'Fund cannot be activated - missing required analysis data' },
        { status: 400 }
      );
    }

    if (existingFund.fund_documents.length === 0) {
      return NextResponse.json(
        { error: 'Fund cannot be activated - no documents uploaded' },
        { status: 400 }
      );
    }

    // Activate the fund
    const activatedFund = await prisma.funds.update({
      where: { id: fundId },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Fund activated successfully',
      fund: {
        id: activatedFund.id,
        name: activatedFund.name,
        status: activatedFund.status,
        updatedAt: activatedFund.updatedAt
      }
    });

  } catch (error) {
    console.error('Error activating fund:', error);
    return NextResponse.json(
      { error: 'Failed to activate fund' },
      { status: 500 }
    );
  }
}