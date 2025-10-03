/*
  Warnings:

  - You are about to drop the `CourseActivityLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CourseActivityLog" DROP CONSTRAINT "CourseActivityLog_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CourseActivityLog" DROP CONSTRAINT "CourseActivityLog_courseMemberId_fkey";

-- DropTable
DROP TABLE "public"."CourseActivityLog";

-- CreateTable
CREATE TABLE "public"."ActivityLog" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "public"."ActivityLog"("userId");

-- AddForeignKey
ALTER TABLE "public"."ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
