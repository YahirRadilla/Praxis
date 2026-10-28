-- DropIndex
DROP INDEX "dictamenes_projectId_evaluatorId_key";

-- CreateIndex
CREATE INDEX "dictamenes_projectId_idx" ON "dictamenes"("projectId");
