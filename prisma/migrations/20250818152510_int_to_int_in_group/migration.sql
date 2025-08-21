/*
  Warnings:

  - Made the column `codeNumber` on table `Group` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Group" ALTER COLUMN "codeNumber" SET NOT NULL;
