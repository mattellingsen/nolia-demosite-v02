import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await params;
    
    // Check if fund exists
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

    // Delete all related documents first (cascade should handle this, but being explicit)
    await prisma.fund_documents.deleteMany({
      where: { fundId: fundId }
    });

    // Delete the fund
    await prisma.funds.delete({
      where: { id: fundId }
    });

    return NextResponse.json({
      success: true,
      message: `Fund "${existingFund.name}" and all associated documents deleted successfully`,
      deletedFund: {
        id: existingFund.id,
        name: existingFund.name,
        documentsDeleted: existingFund.fund_documents.length
      }
    });

  } catch (error) {
    console.error('Error deleting fund:', error);
    return NextResponse.json(
      { error: 'Failed to delete fund' },
      { status: 500 }
    );
  }
}