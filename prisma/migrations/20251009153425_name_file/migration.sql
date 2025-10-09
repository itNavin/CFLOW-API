/*
  Warnings:

  - Added the required column `name` to the `AssignmentFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `FeedbackFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `SubmissionFile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AssignmentFile" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."FeedbackFile" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."SubmissionFile" ADD COLUMN     "name" TEXT NOT NULL;
