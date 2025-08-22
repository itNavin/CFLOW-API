-- AlterTable
ALTER TABLE "public"."Group" ALTER COLUMN "codeNumber" DROP NOT NULL,
ALTER COLUMN "codeNumber" SET DATA TYPE TEXT;
