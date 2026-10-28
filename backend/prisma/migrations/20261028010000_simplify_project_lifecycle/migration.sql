-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- UpdateData
-- Must run before `status` is dropped below:
--  - An ARCHIVED project keeps its archived state, dated by its last update.
--  - A DRAFT project is invisible today regardless of `visibility` (DRAFT always
--    hides it). Once `status` disappears, visibility alone decides what's public,
--    so every draft must become PRIVATE here or it would go public overnight.
UPDATE "projects" SET "archived" = true, "archivedAt" = "updatedAt" WHERE "status" = 'ARCHIVED';
UPDATE "projects" SET "visibility" = 'PRIVATE' WHERE "status" = 'DRAFT';

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "visibility" SET DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "status";

-- DropEnum
DROP TYPE "ProjectStatus";

-- CreateIndex
CREATE INDEX "projects_visibility_archived_idx" ON "projects"("visibility", "archived");
