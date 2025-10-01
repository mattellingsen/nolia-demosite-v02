import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

// POST: Clean up all procurement-admin data
export async function POST(req: NextRequest) {
  try {
    console.log('🗑️ Starting cleanup of procurement-admin data...');

    // Get all procurement admin funds
    const procurementFunds = await prisma.fund.findMany({
      where: {
        moduleType: 'PROCUREMENT_ADMIN'
      },
      include: {
        documents: true,
        backgroundJobs: true
      }
    });

    console.log(`Found ${procurementFunds.length} procurement admin knowledgebases to delete`);

    let deletedFunds = 0;
    let deletedJobs = 0;
    let deletedDocuments = 0;

    for (const fund of procurementFunds) {
      console.log(`Deleting fund: ${fund.name} (${fund.id})`);

      // Delete background jobs first
      await prisma.backgroundJob.deleteMany({
        where: {
          fundId: fund.id
        }
      });
      deletedJobs += fund.backgroundJobs.length;
      console.log(`  ✅ Deleted ${fund.backgroundJobs.length} background jobs`);

      // Delete documents
      await prisma.fundDocument.deleteMany({
        where: {
          fundId: fund.id
        }
      });
      deletedDocuments += fund.documents.length;
      console.log(`  ✅ Deleted ${fund.documents.length} documents`);

      // Delete the fund itself
      await prisma.fund.delete({
        where: {
          id: fund.id
        }
      });
      deletedFunds++;
      console.log(`  ✅ Deleted fund: ${fund.name}`);
    }

    console.log('🎉 Cleanup completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Procurement admin cleanup completed',
      summary: {
        deletedFunds,
        deletedJobs,
        deletedDocuments
      }
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup procurement admin data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// GET: Check what would be cleaned up without deleting
export async function GET(req: NextRequest) {
  try {
    const procurementFunds = await prisma.fund.findMany({
      where: {
        moduleType: 'PROCUREMENT_ADMIN'
      },
      include: {
        documents: true,
        backgroundJobs: true
      }
    });

    const summary = {
      fundsFound: procurementFunds.length,
      totalDocuments: procurementFunds.reduce((sum, fund) => sum + fund.documents.length, 0),
      totalJobs: procurementFunds.reduce((sum, fund) => sum + fund.backgroundJobs.length, 0),
      funds: procurementFunds.map(fund => ({
        id: fund.id,
        name: fund.name,
        status: fund.status,
        documentsCount: fund.documents.length,
        jobsCount: fund.backgroundJobs.length,
        createdAt: fund.createdAt
      }))
    };

    return NextResponse.json({
      success: true,
      message: 'Procurement admin data summary',
      summary
    });

  } catch (error) {
    console.error('❌ Error checking procurement admin data:', error);
    return NextResponse.json(
      {
        error: 'Failed to check procurement admin data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}