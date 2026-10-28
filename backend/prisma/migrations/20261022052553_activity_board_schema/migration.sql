/*
  Warnings:

  - Added the required column `updatedAt` to the `activities` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActivityPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

-- AlterTable
-- updatedAt gets a DEFAULT CURRENT_TIMESTAMP only to satisfy NOT NULL on the 3 existing rows;
-- Prisma's @updatedAt always sets this column explicitly on every write going forward.
ALTER TABLE "activities" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priority" "ActivityPriority" NOT NULL DEFAULT 'MEDIA',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "activity_assignees" (
    "activityId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_assignees_pkey" PRIMARY KEY ("activityId","userId")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "fromStatus" "ActivityStatus",
    "toStatus" "ActivityStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_sections" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "checklist_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "sectionId" INTEGER,
    "text" TEXT NOT NULL,
    "note" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "doneById" INTEGER,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_attachments" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "uploaderId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_comments" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_labels" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,

    CONSTRAINT "project_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_labels" (
    "activityId" INTEGER NOT NULL,
    "labelId" INTEGER NOT NULL,

    CONSTRAINT "activity_labels_pkey" PRIMARY KEY ("activityId","labelId")
);

-- CreateIndex
CREATE INDEX "activity_assignees_userId_idx" ON "activity_assignees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_labels_projectId_name_key" ON "project_labels"("projectId", "name");

-- CreateIndex
CREATE INDEX "activities_projectId_status_position_idx" ON "activities"("projectId", "status", "position");

-- AddForeignKey
ALTER TABLE "activity_assignees" ADD CONSTRAINT "activity_assignees_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_assignees" ADD CONSTRAINT "activity_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_sections" ADD CONSTRAINT "checklist_sections_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "checklist_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_doneById_fkey" FOREIGN KEY ("doneById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attachments" ADD CONSTRAINT "activity_attachments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attachments" ADD CONSTRAINT "activity_attachments_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_labels" ADD CONSTRAINT "project_labels_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_labels" ADD CONSTRAINT "activity_labels_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_labels" ADD CONSTRAINT "activity_labels_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "project_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data backfill (Fase B): migrate the single assigneeId column into the new
-- activity_assignees join table ahead of dropping assigneeId in the next migration.
INSERT INTO "activity_assignees" ("activityId", "userId", "assignedAt")
SELECT "id", "assigneeId", "createdAt" FROM "activities" WHERE "assigneeId" IS NOT NULL;

-- Backfill per-column kanban position for existing activities, ordered by creation time.
UPDATE "activities" a
SET "position" = sub.rn - 1
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "projectId", "status" ORDER BY "createdAt") AS rn
  FROM "activities"
) sub
WHERE a."id" = sub."id";

-- completedAt was never tracked before this phase, so for activities already DONE we
-- approximate it with createdAt. This is a deliberate, documented approximation, not the
-- true completion time, since that moment was never recorded by any prior version of the app.
UPDATE "activities" SET "completedAt" = "createdAt" WHERE "status" = 'DONE';
