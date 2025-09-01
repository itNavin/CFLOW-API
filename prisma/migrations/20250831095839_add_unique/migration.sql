/*
  Warnings:

  - A unique constraint covering the columns `[courseId,userId]` on the table `CourseMember` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[courseId,projectName]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[groupId,courseMemberId,advisorRole]` on the table `GroupAdvisor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[groupId,courseMemberId]` on the table `GroupMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CourseMember_courseId_userId_key" ON "public"."CourseMember"("courseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_courseId_projectName_key" ON "public"."Group"("courseId", "projectName");

-- CreateIndex
CREATE UNIQUE INDEX "GroupAdvisor_groupId_courseMemberId_advisorRole_key" ON "public"."GroupAdvisor"("groupId", "courseMemberId", "advisorRole");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_courseMemberId_key" ON "public"."GroupMember"("groupId", "courseMemberId");
