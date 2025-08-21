/*
  Warnings:

  - A unique constraint covering the columns `[courseId,codeNumber]` on the table `Group` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN     "codeNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Group_courseId_codeNumber_key" ON "public"."Group"("courseId", "codeNumber");
