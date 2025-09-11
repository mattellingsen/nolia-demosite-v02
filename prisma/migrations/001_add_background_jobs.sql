-- Add background job tracking table
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- 'RAG_PROCESSING', 'DOCUMENT_ANALYSIS', etc.
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    "progress" INTEGER NOT NULL DEFAULT 0, -- 0-100
    "totalDocuments" INTEGER NOT NULL DEFAULT 0,
    "processedDocuments" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB DEFAULT '{}',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- Add foreign key relationship
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_fundId_fkey" 
    FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX "BackgroundJob_fundId_idx" ON "BackgroundJob"("fundId");
CREATE INDEX "BackgroundJob_status_idx" ON "BackgroundJob"("status");
CREATE INDEX "BackgroundJob_type_idx" ON "BackgroundJob"("type");