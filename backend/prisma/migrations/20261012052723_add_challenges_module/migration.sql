-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "challengeId" INTEGER;

-- CreateTable
CREATE TABLE "challenges" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" INTEGER NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_sdgs" (
    "challengeId" INTEGER NOT NULL,
    "sdgId" INTEGER NOT NULL,

    CONSTRAINT "challenge_sdgs_pkey" PRIMARY KEY ("challengeId","sdgId")
);

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_sdgs" ADD CONSTRAINT "challenge_sdgs_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_sdgs" ADD CONSTRAINT "challenge_sdgs_sdgId_fkey" FOREIGN KEY ("sdgId") REFERENCES "sdgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
