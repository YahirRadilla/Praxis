-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_assigneeId_fkey";

-- AlterTable
-- Drops the single-assignee column now that it has been backfilled into activity_assignees
-- (previous migration), and drops the stopgap DEFAULT CURRENT_TIMESTAMP that migration
-- 20261022052553_activity_board_schema put on updatedAt only to satisfy NOT NULL for the
-- rows that already existed; Prisma's @updatedAt sets this column explicitly on every
-- write, so no DB-level default is needed going forward.
ALTER TABLE "activities" DROP COLUMN "assigneeId",
ALTER COLUMN "updatedAt" DROP DEFAULT;
