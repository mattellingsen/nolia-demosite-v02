import { NextRequest, NextResponse } from 'next/server';
import { getDocumentForDownload } from '@/lib/database-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params;
    
    const document = await getDocumentForDownload(documentId);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Redirect to the S3 pre-signed URL for direct download
    return NextResponse.redirect(document.downloadUrl);

  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}