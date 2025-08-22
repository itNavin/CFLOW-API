/*
  Warnings:

  - You are about to drop the column `dueDate` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `fileUrl` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the `AssignmentDueDateUpdate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."AssignmentDueDateUpdate" DROP CONSTRAINT "AssignmentDueDateUpdate_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssignmentDueDateUpdate" DROP CONSTRAINT "AssignmentDueDateUpdate_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssignmentDueDateUpdate" DROP CONSTRAINT "AssignmentDueDateUpdate_updatedById_fkey";

-- AlterTable
ALTER TABLE "public"."Assignment" DROP COLUMN "dueDate";

-- AlterTable
ALTER TABLE "public"."Feedback" DROP COLUMN "fileUrl";

-- AlterTable
ALTER TABLE "public"."Submission" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "public"."AssignmentDueDateUpdate";

-- CreateTable
CREATE TABLE "public"."AssignmentDueDate" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentDueDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedbackFile" (
    "id" SERIAL NOT NULL,
    "feedbackId" INTEGER NOT NULL,
    "deliverableId" INTEGER NOT NULL,
    "fileUrl" TEXT[],

    CONSTRAINT "FeedbackFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssignmentDueDate_assignmentId_idx" ON "public"."AssignmentDueDate"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentDueDate_groupId_idx" ON "public"."AssignmentDueDate"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentDueDate_assignmentId_groupId_key" ON "public"."AssignmentDueDate"("assignmentId", "groupId");

-- CreateIndex
CREATE INDEX "FeedbackFile_feedbackId_idx" ON "public"."FeedbackFile"("feedbackId");

-- CreateIndex
CREATE INDEX "FeedbackFile_deliverableId_idx" ON "public"."FeedbackFile"("deliverableId");

-- AddForeignKey
ALTER TABLE "public"."AssignmentDueDate" ADD CONSTRAINT "AssignmentDueDate_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssignmentDueDate" ADD CONSTRAINT "AssignmentDueDate_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackFile" ADD CONSTRAINT "FeedbackFile_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "public"."Feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackFile" ADD CONSTRAINT "FeedbackFile_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "public"."Deliverable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
