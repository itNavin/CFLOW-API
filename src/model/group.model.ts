import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";

class GroupModel {
  static async createGroup(data: {
    courseId: string;
    codeNumber?: string | null;
    projectName: string;
    productName?: string | null;
    company?: string | null;
    memberIds?: { id: string; workRole: string | null }[];
    advisorIds?: string[];
    coAdvisorIds?: string[];
  }) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newGroup = await tx.group.create({
        data: {
          courseId: data.courseId,
          codeNumber: data.codeNumber ?? null,
          projectName: data.projectName,
          productName: data.productName ?? undefined,
          company: data.company ?? undefined,
        },
      });

      const validateCourseMembers = async (ids: string[]) => {
        if (!ids.length)
          return { existingIds: new Set<string>(), missing: [] as string[] };

        const rows = await tx.courseMember.findMany({
          where: { courseId: data.courseId, id: { in: ids } },
          select: { id: true },
        });
        const existingIds = new Set(rows.map((r) => r.id));
        const missing = ids.filter((id) => !existingIds.has(id));
        return { existingIds, missing };
      };

      const memberIds = data.memberIds?.map((m) => m.id) ?? [];
      const { existingIds: memberExisting, missing: memberMissing } =
        await validateCourseMembers(memberIds);
      if (memberMissing.length) {
        const err: any = new Error(
          `Invalid memberIds for course ${data.courseId}: ${memberMissing.join(
            ", "
          )}`
        );
        err.status = 400;
        throw err;
      }

      const advisorIds = data.advisorIds ?? [];
      const { existingIds: advisorExisting, missing: advisorMissing } =
        await validateCourseMembers(advisorIds);
      if (advisorMissing.length) {
        const err: any = new Error(
          `Invalid advisorIds for course ${
            data.courseId
          }: ${advisorMissing.join(", ")}`
        );
        err.status = 400;
        throw err;
      }

      const coAdvisorIds = data.coAdvisorIds ?? [];
      const { existingIds: coAdvisorExisting, missing: coAdvisorMissing } =
        await validateCourseMembers(coAdvisorIds);
      if (coAdvisorMissing.length) {
        const err: any = new Error(
          `Invalid coAdvisorIds for course ${
            data.courseId
          }: ${coAdvisorMissing.join(", ")}`
        );
        err.status = 400;
        throw err;
      }

      if (data.memberIds?.length) {
        const rows = data.memberIds
          .filter((m) => memberExisting.has(m.id))
          .map(({ id, workRole }) => ({
            courseMemberId: id, 
            groupId: newGroup.id, 
            workRole: workRole ?? undefined, 
          }));

        if (rows.length) {
          await tx.groupMember.createMany({ data: rows });
        }
      }

      if (advisorExisting.size) {
        await tx.groupAdvisor.createMany({
          data: [...advisorExisting].map((courseMemberId) => ({
            courseMemberId, 
            groupId: newGroup.id,
            advisorRole: "ADVISOR",
          })),
        });
      }

      if (coAdvisorExisting.size) {
        await tx.groupAdvisor.createMany({
          data: [...coAdvisorExisting].map((courseMemberId) => ({
            courseMemberId, 
            groupId: newGroup.id,
            advisorRole: "CO_ADVISOR",
          })),
        });
      }

      return newGroup;
    });
  }

  static async getAllGroups(courseId: string) {
    return prisma.group.findMany({
      where: { courseId },
      include: {
        members: {
          include: { courseMember: { include: { user: true } } },
        },
        advisors: {
          include: { courseMember: { include: { user: true } } },
        },
      },
    });
  }

  static async updateGroup(
    groupId: string,
    courseId: string,
    data: {
      codeNumber?: string | null;
      projectName?: string;
      productName?: string | null;
      company?: string | null;
      memberIds?: { id: string; workRole?: string | null }[];
      advisorIds?: string[];
      coAdvisorIds?: string[];
    }
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const group = await tx.group.findUnique({
        where: { id: groupId },
        select: { id: true, courseId: true },
      });
      if (!group || group.courseId !== courseId) {
        const err: any = new Error("Group not found for this course");
        err.status = 404;
        throw err;
      }

      const toUpdate: Prisma.GroupUpdateInput = {};
      if (data.codeNumber !== undefined) toUpdate.codeNumber = data.codeNumber;
      if (data.projectName !== undefined)
        toUpdate.projectName = data.projectName;
      if (data.productName !== undefined)
        toUpdate.productName = data.productName;
      if (data.company !== undefined) toUpdate.company = data.company;

      if (Object.keys(toUpdate).length) {
        await tx.group.update({
          where: { id: groupId },
          data: toUpdate,
        });
      }

      const validateCourseMembers = async (ids: string[]) => {
        if (!ids?.length)
          return { existingIds: new Set<string>(), missing: [] as string[] };
        const rows = await tx.courseMember.findMany({
          where: { courseId, id: { in: ids } },
          select: { id: true },
        });
        const existingIds = new Set(rows.map((r) => r.id));
        const missing = ids.filter((id) => !existingIds.has(id));
        return { existingIds, missing };
      };

      if (data.memberIds) {
        const memberIds = data.memberIds.map((m) => m.id);
        const { existingIds, missing } = await validateCourseMembers(memberIds);
        if (missing.length) {
          const err: any = new Error(
            `Invalid memberIds for course ${courseId}: ${missing.join(", ")}`
          );
          err.status = 400;
          throw err;
        }

        await tx.groupMember.deleteMany({ where: { groupId } });

        if (existingIds.size) {
          const rows = data.memberIds
            .filter((m) => existingIds.has(m.id))
            .map(({ id, workRole }) => ({
              courseMemberId: id, 
              groupId,
              workRole: String(workRole ?? "").trim(),
            }));
          if (rows.length) await tx.groupMember.createMany({ data: rows });
        }
      }

      const replaceAdvisors = async (
        ids: string[] | undefined,
        role: "ADVISOR" | "CO_ADVISOR"
      ) => {
        if (ids === undefined) return;
        const { existingIds, missing } = await validateCourseMembers(ids ?? []);
        if (missing.length) {
          const err: any = new Error(
            `Invalid ${
              role === "ADVISOR" ? "advisorIds" : "coAdvisorIds"
            } for course ${courseId}: ${missing.join(", ")}`
          );
          err.status = 400;
          throw err;
        }
        await tx.groupAdvisor.deleteMany({
          where: { groupId, advisorRole: role },
        });

        if (existingIds.size) {
          await tx.groupAdvisor.createMany({
            data: [...existingIds].map((courseMemberId) => ({
              courseMemberId, 
              groupId,
              advisorRole: role,
            })),
          });
        }
      };

      await replaceAdvisors(data.advisorIds, "ADVISOR");
      await replaceAdvisors(data.coAdvisorIds, "CO_ADVISOR");

      const updated = await tx.group.findUnique({
        where: { id: groupId },
        include: {
          members: true,
          advisors: true,
        },
      });
      return updated!;
    });
  }
}

export default GroupModel;
