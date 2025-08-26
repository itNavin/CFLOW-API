/*
  Warnings:

  - A unique constraint covering the columns `[deliverableId,mime]` on the table `AllowedFileType` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."AllowedFileType" ADD COLUMN     "mime" TEXT;

-- CreateIndex
CREATE INDEX "AllowedFileType_deliverableId_idx" ON "public"."AllowedFileType"("deliverableId");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedFileType_deliverableId_mime_key" ON "public"."AllowedFileType"("deliverableId", "mime");
