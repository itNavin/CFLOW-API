/*
  Warnings:

  - You are about to drop the `Announcementfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Announcementfile" DROP CONSTRAINT "Announcementfile_announcementId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Announcementfile" DROP CONSTRAINT "Announcementfile_fileId_fkey";

-- AlterTable
ALTER TABLE "public"."File" ADD COLUMN     "announcementId" INTEGER;

-- DropTable
DROP TABLE "public"."Announcementfile";

-- CreateIndex
CREATE INDEX "File_announcementId_idx" ON "public"."File"("announcementId");

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "public"."Announcement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
