-- Data: downgrade any pre-existing TEACHER/ORGANIZATION role rows before the
-- enum below is narrowed to OWNER/COLLABORATOR. The frontend never sends
-- these values, but the backend used to compute them via
-- roleForAccountType, so real rows can carry them. This MUST run before the
-- AlterEnum block, or the USING cast to the new enum type fails on them.
UPDATE "team_requests" SET "role" = 'COLLABORATOR' WHERE "role" IN ('TEACHER', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "TeamRequestPurpose" AS ENUM ('MEMBER', 'EVALUATOR');

-- AlterEnum
BEGIN;
CREATE TYPE "TeamRequestRole_new" AS ENUM ('OWNER', 'COLLABORATOR');
ALTER TABLE "team_requests" ALTER COLUMN "role" TYPE "TeamRequestRole_new" USING ("role"::text::"TeamRequestRole_new");
ALTER TYPE "TeamRequestRole" RENAME TO "TeamRequestRole_old";
ALTER TYPE "TeamRequestRole_new" RENAME TO "TeamRequestRole";
DROP TYPE "TeamRequestRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "team_requests" ADD COLUMN     "purpose" "TeamRequestPurpose" NOT NULL DEFAULT 'MEMBER',
ALTER COLUMN "role" SET DEFAULT 'COLLABORATOR';

-- Data: existing teacherId/organizationId links on projects were never
-- consented to (WU-05 later adds the invitation flow that fills these only
-- via an accepted EVALUATOR TeamRequest). Clear them here; seed.ts recreates
-- the demo links as accepted EVALUATOR TeamRequest rows plus the direct
-- project field (seed data is allowed to set up already-accepted state
-- directly, since it doesn't go through the real consent-flow validation).
UPDATE "projects" SET "teacherId" = NULL, "organizationId" = NULL;

