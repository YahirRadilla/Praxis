-- CreateTable
CREATE TABLE "class_group_members" (
    "classGroupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_group_members_pkey" PRIMARY KEY ("classGroupId","userId")
);

-- CreateIndex
CREATE INDEX "class_group_members_userId_idx" ON "class_group_members"("userId");

-- AddForeignKey
ALTER TABLE "class_group_members" ADD CONSTRAINT "class_group_members_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "class_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_group_members" ADD CONSTRAINT "class_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
