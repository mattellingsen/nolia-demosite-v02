import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;
    
    if (adminKey && authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin API key required' },
        { status: 401 }
      );
    }

    console.log('Running database migration for background jobs...');

    // Check if background_jobs table already exists
    const tableExists = await checkTableExists();
    
    if (tableExists) {
      return NextResponse.json({
        success: true,
        message: 'Background jobs table already exists',
        alreadyExists: true
      });
    }

    // Run the migration SQL
    await runMigration();
    
    console.log('Database migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      tablesCreated: ['background_jobs'],
      enumsCreated: ['JobStatus', 'JobType'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database migration failed:', error);
    return NextResponse.json(
      { 
        error: 'Database migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function checkTableExists(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'background_jobs'
      ) as exists;
    `;
    
    return (result as any[])[0]?.exists || false;
  } catch (error) {
    console.log('Error checking table existence:', error);
    return false;
  }
}

async function runMigration(): Promise<void> {
  try {
    // Create enums first
    await prisma.$executeRaw`
      CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
    `;
    
    await prisma.$executeRaw`
      CREATE TYPE "JobType" AS ENUM ('RAG_PROCESSING', 'DOCUMENT_ANALYSIS');
    `;

    // Create the background_jobs table
    await prisma.$executeRaw`
      CREATE TABLE "background_jobs" (
          "id" TEXT NOT NULL,
          "fundId" TEXT NOT NULL,
          "type" "JobType" NOT NULL,
          "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
          "progress" INTEGER NOT NULL DEFAULT 0,
          "totalDocuments" INTEGER NOT NULL DEFAULT 0,
          "processedDocuments" INTEGER NOT NULL DEFAULT 0,
          "metadata" JSONB NOT NULL DEFAULT '{}',
          "errorMessage" TEXT,
          "startedAt" TIMESTAMP(3),
          "completedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
      );
    `;

    // Add foreign key constraint
    await prisma.$executeRaw`
      ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_fundId_fkey" 
          FOREIGN KEY ("fundId") REFERENCES "funds" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;

    // Add indexes
    await prisma.$executeRaw`
      CREATE INDEX "background_jobs_fundId_idx" ON "background_jobs"("fundId");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX "background_jobs_status_idx" ON "background_jobs"("status");
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX "background_jobs_type_idx" ON "background_jobs"("type");
    `;

    console.log('All migration steps completed successfully');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Allow GET for easy testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Database migration endpoint',
    instructions: 'Send POST request with Authorization: Bearer {ADMIN_API_KEY} to run migration',
    adminKeyRequired: !!process.env.ADMIN_API_KEY
  });
}