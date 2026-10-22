-- CreateEnum
CREATE TYPE "TeamRequestInitiator" AS ENUM ('REQUESTER', 'OWNER');

-- AlterTable
ALTER TABLE "team_requests" ADD COLUMN     "initiatedBy" "TeamRequestInitiator" NOT NULL DEFAULT 'REQUESTER';
