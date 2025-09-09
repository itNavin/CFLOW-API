/*
  Warnings:

  - The primary key for the `AllowedFileType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Announcement` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Assignment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `AssignmentDueDate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Course` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `CourseActivityLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `CourseMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Deliverable` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Feedback` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `FeedbackFile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `File` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `announcementId` column on the `File` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Group` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GroupAdvisor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GroupMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Submission` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SubmissionFile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `AllowedFileType` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `deliverableId` on the `AllowedFileType` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Announcement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseId` on the `Announcement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `schedule` on table `Announcement` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `id` on the `Assignment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `schedule` on table `Assignment` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `courseId` on the `Assignment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `AssignmentDueDate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `assignmentId` on the `AssignmentDueDate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `groupId` on the `AssignmentDueDate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Course` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `CourseActivityLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseId` on the `CourseActivityLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseMemberId` on the `CourseActivityLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `entityId` on the `CourseActivityLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `CourseMember` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseId` on the `CourseMember` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Deliverable` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `assignmentId` on the `Deliverable` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Feedback` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `submissionId` on the `Feedback` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `FeedbackFile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `feedbackId` on the `FeedbackFile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `deliverableId` on the `FeedbackFile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `File` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseId` on the `File` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Group` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseId` on the `Group` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `GroupAdvisor` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseMemberId` on the `GroupAdvisor` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `groupId` on the `GroupAdvisor` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `GroupMember` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `courseMemberId` on the `GroupMember` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `groupId` on the `GroupMember` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `Submission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `assignmentId` on the `Submission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `groupId` on the `Submission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `SubmissionFile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `submissionId` on the `SubmissionFile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `deliverableId` on the `SubmissionFile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."AllowedFileType" DROP CONSTRAINT "AllowedFileType_deliverableId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Announcement" DROP CONSTRAINT "Announcement_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Assignment" DROP CONSTRAINT "Assignment_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssignmentDueDate" DROP CONSTRAINT "AssignmentDueDate_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AssignmentDueDate" DROP CONSTRAINT "AssignmentDueDate_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CourseActivityLog" DROP CONSTRAINT "CourseActivityLog_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CourseActivityLog" DROP CONSTRAINT "CourseActivityLog_courseMemberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CourseMember" DROP CONSTRAINT "CourseMember_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Deliverable" DROP CONSTRAINT "Deliverable_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Feedback" DROP CONSTRAINT "Feedback_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FeedbackFile" DROP CONSTRAINT "FeedbackFile_deliverableId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FeedbackFile" DROP CONSTRAINT "FeedbackFile_feedbackId_fkey";

-- DropForeignKey
ALTER TABLE "public"."File" DROP CONSTRAINT "File_announcementId_fkey";

-- DropForeignKey
ALTER TABLE "public"."File" DROP CONSTRAINT "File_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupAdvisor" DROP CONSTRAINT "GroupAdvisor_courseMemberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupAdvisor" DROP CONSTRAINT "GroupAdvisor_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupMember" DROP CONSTRAINT "GroupMember_courseMemberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."GroupMember" DROP CONSTRAINT "GroupMember_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Submission" DROP CONSTRAINT "Submission_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Submission" DROP CONSTRAINT "Submission_groupId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SubmissionFile" DROP CONSTRAINT "SubmissionFile_deliverableId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SubmissionFile" DROP CONSTRAINT "SubmissionFile_submissionId_fkey";

-- AlterTable
ALTER TABLE "public"."AllowedFileType" DROP CONSTRAINT "AllowedFileType_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "deliverableId",
ADD COLUMN     "deliverableId" UUID NOT NULL,
ADD CONSTRAINT "AllowedFileType_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Announcement" DROP CONSTRAINT "Announcement_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "courseId",
ADD COLUMN     "courseId" UUID NOT NULL,
ALTER COLUMN "schedule" SET NOT NULL,
ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Assignment" DROP CONSTRAINT "Assignment_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "schedule" SET NOT NULL,
DROP COLUMN "courseId",
ADD COLUMN     "courseId" UUID NOT NULL,
ADD CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."AssignmentDueDate" DROP CONSTRAINT "AssignmentDueDate_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "assignmentId",
ADD COLUMN     "assignmentId" UUID NOT NULL,
DROP COLUMN "groupId",
ADD COLUMN     "groupId" UUID NOT NULL,
ADD CONSTRAINT "AssignmentDueDate_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Course" DROP CONSTRAINT "Course_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ADD CONSTRAINT "Course_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."CourseActivityLog" DROP CONSTRAINT "CourseActivityLog_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "courseId",
ADD COLUMN     "courseId" UUID NOT NULL,
DROP COLUMN "courseMemberId",
ADD COLUMN     "courseMemberId" UUID NOT NULL,
DROP COLUMN "entityId",
ADD COLUMN     "entityId" UUID NOT NULL,
ADD CONSTRAINT "CourseActivityLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."CourseMember" DROP CONSTRAINT "CourseMember_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "courseId",
ADD COLUMN     "courseId" UUID NOT NULL,
ADD CONSTRAINT "CourseMember_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Deliverable" DROP CONSTRAINT "Deliverable_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "assignmentId",
ADD COLUMN     "assignmentId" UUID NOT NULL,
ADD CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Feedback" DROP CONSTRAINT "Feedback_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "submissionId",
ADD COLUMN     "submissionId" UUID NOT NULL,
ADD CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."FeedbackFile" DROP CONSTRAINT "FeedbackFile_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "feedbackId",
ADD COLUMN     "feedbackId" UUID NOT NULL,
DROP COLUMN "deliverableId",
ADD COLUMN     "deliverableId" UUID NOT NULL,
ADD CONSTRAINT "FeedbackFile_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."File" DROP CONSTRAINT "File_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "announcementId",
ADD COLUMN     "announcementId" UUID,
DROP COLUMN "courseId",
ADD COLUMN     "courseId" UUID NOT NULL,
ADD CONSTRAINT "File_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Group" DROP CONSTRAINT "Group_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "courseId",
ADD COLUMN     "courseId" UUID NOT NULL,
ADD CONSTRAINT "Group_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."GroupAdvisor" DROP CONSTRAINT "GroupAdvisor_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "courseMemberId",
ADD COLUMN     "courseMemberId" UUID NOT NULL,
DROP COLUMN "groupId",
ADD COLUMN     "groupId" UUID NOT NULL,
ADD CONSTRAINT "GroupAdvisor_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."GroupMember" DROP CONSTRAINT "GroupMember_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "courseMemberId",
ADD COLUMN     "courseMemberId" UUID NOT NULL,
DROP COLUMN "groupId",
ADD COLUMN     "groupId" UUID NOT NULL,
ADD CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."Submission" DROP CONSTRAINT "Submission_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "assignmentId",
ADD COLUMN     "assignmentId" UUID NOT NULL,
DROP COLUMN "groupId",
ADD COLUMN     "groupId" UUID NOT NULL,
ADD CONSTRAINT "Submission_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."SubmissionFile" DROP CONSTRAINT "SubmissionFile_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "submissionId",
ADD COLUMN     "submissionId" UUID NOT NULL,
DROP COLUMN "deliverableId",
ADD COLUMN     "deliverableId" UUID NOT NULL,
ADD CONSTRAINT "SubmissionFile_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "AllowedFileType_deliverableId_idx" ON "public"."AllowedFileType"("deliverableId");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedFileType_deliverableId_mime_key" ON "public"."AllowedFileType"("deliverableId", "mime");

-- CreateIndex
CREATE INDEX "AssignmentDueDate_assignmentId_idx" ON "public"."AssignmentDueDate"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentDueDate_groupId_idx" ON "public"."AssignmentDueDate"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentDueDate_assignmentId_groupId_key" ON "public"."AssignmentDueDate"("assignmentId", "groupId");

-- CreateIndex
CREATE INDEX "CourseActivityLog_courseId_entityType_entityId_idx" ON "public"."CourseActivityLog"("courseId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "CourseMember_courseId_idx" ON "public"."CourseMember"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseMember_courseId_userId_key" ON "public"."CourseMember"("courseId", "userId");

-- CreateIndex
CREATE INDEX "FeedbackFile_feedbackId_idx" ON "public"."FeedbackFile"("feedbackId");

-- CreateIndex
CREATE INDEX "FeedbackFile_deliverableId_idx" ON "public"."FeedbackFile"("deliverableId");

-- CreateIndex
CREATE INDEX "File_courseId_idx" ON "public"."File"("courseId");

-- CreateIndex
CREATE INDEX "File_announcementId_idx" ON "public"."File"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_courseId_codeNumber_key" ON "public"."Group"("courseId", "codeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Group_courseId_projectName_key" ON "public"."Group"("courseId", "projectName");

-- CreateIndex
CREATE UNIQUE INDEX "GroupAdvisor_groupId_courseMemberId_advisorRole_key" ON "public"."GroupAdvisor"("groupId", "courseMemberId", "advisorRole");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_courseMemberId_key" ON "public"."GroupMember"("groupId", "courseMemberId");

-- AddForeignKey
ALTER TABLE "public"."CourseMember" ADD CONSTRAINT "CourseMember_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Group" ADD CONSTRAINT "Group_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMember" ADD CONSTRAINT "GroupMember_courseMemberId_fkey" FOREIGN KEY ("courseMemberId") REFERENCES "public"."CourseMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupAdvisor" ADD CONSTRAINT "GroupAdvisor_courseMemberId_fkey" FOREIGN KEY ("courseMemberId") REFERENCES "public"."CourseMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupAdvisor" ADD CONSTRAINT "GroupAdvisor_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssignmentDueDate" ADD CONSTRAINT "AssignmentDueDate_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssignmentDueDate" ADD CONSTRAINT "AssignmentDueDate_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deliverable" ADD CONSTRAINT "Deliverable_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AllowedFileType" ADD CONSTRAINT "AllowedFileType_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "public"."Deliverable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubmissionFile" ADD CONSTRAINT "SubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubmissionFile" ADD CONSTRAINT "SubmissionFile_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "public"."Deliverable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackFile" ADD CONSTRAINT "FeedbackFile_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "public"."Feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackFile" ADD CONSTRAINT "FeedbackFile_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "public"."Deliverable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Announcement" ADD CONSTRAINT "Announcement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "public"."Announcement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseActivityLog" ADD CONSTRAINT "CourseActivityLog_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseActivityLog" ADD CONSTRAINT "CourseActivityLog_courseMemberId_fkey" FOREIGN KEY ("courseMemberId") REFERENCES "public"."CourseMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
