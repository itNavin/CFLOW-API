-- AlterTable
ALTER TABLE "public"."AssignmentFile" ALTER COLUMN "fileUrl" SET NOT NULL,
ALTER COLUMN "fileUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."FeedbackFile" ALTER COLUMN "fileUrl" SET NOT NULL,
ALTER COLUMN "fileUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."SubmissionFile" ALTER COLUMN "fileUrl" SET NOT NULL,
ALTER COLUMN "fileUrl" SET DATA TYPE TEXT;
