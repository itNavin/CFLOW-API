/*
  Warnings:

  - The values [RESIGNED,RETIRED] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."UserStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED');
ALTER TABLE "public"."User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."User" ALTER COLUMN "status" TYPE "public"."UserStatus_new" USING ("status"::text::"public"."UserStatus_new");
ALTER TYPE "public"."UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "public"."UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "public"."UserStatus_old";
ALTER TABLE "public"."User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;
