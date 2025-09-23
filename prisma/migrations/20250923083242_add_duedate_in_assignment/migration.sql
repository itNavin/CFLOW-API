/*
  Warnings:

  - Added the required column `dueDate` to the `Assignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Assignment" ADD COLUMN     "dueDate" TIMESTAMPTZ(3) NOT NULL;
