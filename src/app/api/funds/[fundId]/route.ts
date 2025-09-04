import { NextRequest, NextResponse } from 'next/server';
import { getFundWithDocuments } from '@/lib/database-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { fundId: string } }
) {
  try {
    const { fundId } = params;
    
    const fund = await getFundWithDocuments(fundId);
    
    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      );
    }

    // Return fund data with document metadata (not binary data)
    return NextResponse.json({
      success: true,
      fund: {
        id: fund.id,
        name: fund.name,
        description: fund.description,
        status: fund.status,
        createdAt: fund.createdAt,
        updatedAt: fund.updatedAt,
        applicationFormAnalysis: fund.applicationFormAnalysis,
        selectionCriteriaAnalysis: fund.selectionCriteriaAnalysis,
        goodExamplesAnalysis: fund.goodExamplesAnalysis,
        documents: fund.documents.map(doc => ({
          id: doc.id,
          documentType: doc.documentType,
          filename: doc.filename,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          uploadedAt: doc.uploadedAt
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching fund:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fund' },
      { status: 500 }
    );
  }
}