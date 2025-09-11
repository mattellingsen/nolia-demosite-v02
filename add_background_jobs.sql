-- Add new enums for background jobs
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "JobType" AS ENUM ('RAG_PROCESSING', 'DOCUMENT_ANALYSIS');

-- Create background jobs table
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

-- Add foreign key constraint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_fundId_fkey" 
    FOREIGN KEY ("fundId") REFERENCES "funds" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "background_jobs_fundId_idx" ON "background_jobs"("fundId");
CREATE INDEX "background_jobs_status_idx" ON "background_jobs"("status");
CREATE INDEX "background_jobs_type_idx" ON "background_jobs"("type");