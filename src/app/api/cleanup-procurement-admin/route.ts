import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

// POST: Clean up all procurement-admin data
export async function POST(req: NextRequest) {
  try {
    console.log('🗑️ Starting cleanup of procurement-admin data...');

    // Get all procurement admin funds
    const procurementFunds = await prisma.funds.findMany({
      where: {
        moduleType: 'PROCUREMENT_ADMIN'
      },
      include: {
        fund_documents: true,
        background_jobs: true
      }
    });

    console.log(`Found ${procurementFunds.length} procurement admin knowledgebases to delete`);

    let deletedFunds = 0;
    let deletedJobs = 0;
    let deletedDocuments = 0;

    for (const fund of procurementFunds) {
      console.log(`Deleting fund: ${fund.name} (${fund.id})`);

      // Delete background jobs first
      await prisma.background_jobs.deleteMany({
        where: {
          fundId: fund.id
        }
      });
      deletedJobs += fund.background_jobs.length;
      console.log(`  ✅ Deleted ${fund.background_jobs.length} background jobs`);

      // Delete documents
      await prisma.fund_documents.deleteMany({
        where: {
          fundId: fund.id
        }
      });
      deletedDocuments += fund.fund_documents.length;
      console.log(`  ✅ Deleted ${fund.fund_documents.length} documents`);

      // Delete the fund itself
      await prisma.funds.delete({
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
    const procurementFunds = await prisma.funds.findMany({
      where: {
        moduleType: 'PROCUREMENT_ADMIN'
      },
      include: {
        fund_documents: true,
        background_jobs: true
      }
    });

    const summary = {
      fundsFound: procurementFunds.length,
      totalDocuments: procurementFunds.reduce((sum, fund) => sum + fund.fund_documents.length, 0),
      totalJobs: procurementFunds.reduce((sum, fund) => sum + fund.background_jobs.length, 0),
      funds: procurementFunds.map(fund => ({
        id: fund.id,
        name: fund.name,
        status: fund.status,
        documentsCount: fund.fund_documents.length,
        jobsCount: fund.background_jobs.length,
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