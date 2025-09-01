/*
  Warnings:

  - Added the required column `courseId` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."File" ADD COLUMN     "courseId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "File_courseId_idx" ON "public"."File"("courseId");

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
