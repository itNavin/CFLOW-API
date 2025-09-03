/*
  Warnings:

  - The values [ADVISOR,ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `prefix` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `surname` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Made the column `mime` on table `AllowedFileType` required. This step will fail if there are existing NULL values in that column.
  - Made the column `submittedAt` on table `Submission` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Role_new" AS ENUM ('STUDENT', 'LECTURER', 'STAFF', 'SUPER_ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" TYPE "public"."Role_new" USING ("role"::text::"public"."Role_new");
ALTER TYPE "public"."Role" RENAME TO "Role_old";
ALTER TYPE "public"."Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Announcement" DROP CONSTRAINT "Announcement_createById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Course" DROP CONSTRAINT "Course_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."CourseMember" DROP CONSTRAINT "CourseMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."File" DROP CONSTRAINT "File_createdById_fkey";

-- AlterTable
ALTER TABLE "public"."AllowedFileType" ALTER COLUMN "mime" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Announcement" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "createById" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."Assignment" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "schedule" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Course" ALTER COLUMN "createdById" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."CourseMember" ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."Feedback" ALTER COLUMN "comment" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."File" ALTER COLUMN "createdById" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."GroupMember" ALTER COLUMN "workRole" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Submission" ALTER COLUMN "submittedAt" SET NOT NULL,
ALTER COLUMN "submittedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "passwordHash",
DROP COLUMN "prefix",
DROP COLUMN "surname",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "public"."User"("name");

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseMember" ADD CONSTRAINT "CourseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Announcement" ADD CONSTRAINT "Announcement_createById_fkey" FOREIGN KEY ("createById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
