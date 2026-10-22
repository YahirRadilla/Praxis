-- CreateEnum
CREATE TYPE "DictamenVerdict" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "dictamenes" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "evaluatorId" INTEGER NOT NULL,
    "verdict" "DictamenVerdict" NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dictamenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dictamenes_projectId_evaluatorId_key" ON "dictamenes"("projectId", "evaluatorId");

-- AddForeignKey
ALTER TABLE "dictamenes" ADD CONSTRAINT "dictamenes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dictamenes" ADD CONSTRAINT "dictamenes_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
