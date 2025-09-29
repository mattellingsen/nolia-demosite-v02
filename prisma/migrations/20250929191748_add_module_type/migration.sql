-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('FUNDING', 'PROCUREMENT');

-- AlterTable
ALTER TABLE "funds" ADD COLUMN "moduleType" "ModuleType" NOT NULL DEFAULT 'FUNDING';

-- AlterTable
ALTER TABLE "fund_documents" ADD COLUMN "moduleType" "ModuleType" NOT NULL DEFAULT 'FUNDING';

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN "moduleType" "ModuleType" NOT NULL DEFAULT 'FUNDING';

-- AlterTable
ALTER TABLE "background_jobs" ADD COLUMN "moduleType" "ModuleType" NOT NULL DEFAULT 'FUNDING';

-- CreateIndex
CREATE INDEX "funds_moduleType_idx" ON "funds"("moduleType");

-- CreateIndex
CREATE INDEX "fund_documents_moduleType_idx" ON "fund_documents"("moduleType");

-- CreateIndex
CREATE INDEX "assessments_moduleType_idx" ON "assessments"("moduleType");

-- CreateIndex
CREATE INDEX "background_jobs_moduleType_idx" ON "background_jobs"("moduleType");