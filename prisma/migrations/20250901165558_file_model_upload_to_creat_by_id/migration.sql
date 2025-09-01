/*
  Warnings:

  - You are about to drop the column `uploadById` on the `File` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."File" DROP CONSTRAINT "File_uploadById_fkey";

-- AlterTable
ALTER TABLE "public"."File" DROP COLUMN "uploadById",
ADD COLUMN     "createdById" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
