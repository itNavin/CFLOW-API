import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";

class GroupModel {
  static async createGroup(data: {
    courseId: number;
    codeNumber?: string | null; // admin provides, can be null
    projectName: string;
    productName?: string | null;
    company?: string | null;
    memberIds?: { id: number; workRole: string }[];
    advisorIds?: number[];
    coAdvisorIds?: number[];
  }) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Create the group first
      const newGroup = await tx.group.create({
        data: {
          courseId: data.courseId,
          codeNumber: data.codeNumber ?? null,
          projectName: data.projectName,
          productName: data.productName ?? undefined,
          company: data.company ?? undefined,
        },
      });

      // Helper to validate CourseMember IDs for this course
      const validateCourseMembers = async (ids: number[]) => {
        if (!ids.length)
          return { existingIds: new Set<number>(), missing: [] as number[] };

        const rows = await tx.courseMember.findMany({
          where: { courseId: data.courseId, id: { in: ids } },
          select: { id: true },
        });
        const existingIds = new Set(rows.map((r) => r.id));
        const missing = ids.filter((id) => !existingIds.has(id));
        return { existingIds, missing };
      };

      // 2) Validate members
      const memberIds = data.memberIds?.map((m) => m.id) ?? [];
      const { existingIds: memberExisting, missing: memberMissing } =
        await validateCourseMembers(memberIds);
      if (memberMissing.length) {
        // Throwing an error here will make controller return 400
        const err: any = new Error(
          `Invalid memberIds for course ${data.courseId}: ${memberMissing.join(
            ", "
          )}`
        );
        err.status = 400;
        throw err;
      }

      // 3) Validate advisors
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

      // 4) Validate co-advisors
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

      // 5) Create members (only valid)
      if (data.memberIds?.length) {
        const rows = data.memberIds
          .filter((m) => memberExisting.has(m.id))
          .map(({ id, workRole }) => ({
            courseMemberId: id,
            groupId: newGroup.id,
            workRole,
          }));

        if (rows.length) {
          await tx.groupMember.createMany({ data: rows });
        }
      }

      // 6) Create advisors
      if (advisorExisting.size) {
        await tx.groupAdvisor.createMany({
          data: [...advisorExisting].map((courseMemberId) => ({
            courseMemberId,
            groupId: newGroup.id,
            advisorRole: "ADVISOR",
          })),
        });
      }

      // 7) Create co-advisors
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

  static async getAllGroups(courseId: number) {
    return prisma.group.findMany({
      where: { courseId },
      include: {
        members: true,
        advisors: true,
      },
    });
  }

  static async updateGroup(
    groupId: number,
    courseId: number,
    data: {
      codeNumber?: string | null;
      projectName?: string;
      productName?: string | null;
      company?: string | null;

      // FULL REPLACE semantics if provided:
      memberIds?: { id: number; workRole: string }[];
      advisorIds?: number[];
      coAdvisorIds?: number[];
    }
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 0) Find group & verify it belongs to course
      const group = await tx.group.findUnique({
        where: { id: groupId },
        select: { id: true, courseId: true },
      });
      if (!group || group.courseId !== courseId) {
        const err: any = new Error("Group not found for this course");
        err.status = 404;
        throw err;
      }

      // 1) Update core fields (patch only what's provided)
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

      // Helper to validate CourseMember IDs for this course
      const validateCourseMembers = async (ids: number[]) => {
        if (!ids?.length)
          return { existingIds: new Set<number>(), missing: [] as number[] };
        const rows = await tx.courseMember.findMany({
          where: { courseId, id: { in: ids } },
          select: { id: true },
        });
        const existingIds = new Set(rows.map((r) => r.id));
        const missing = ids.filter((id) => !existingIds.has(id));
        return { existingIds, missing };
      };

      // 2) Replace members if provided
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

        // remove all current members of this group
        await tx.groupMember.deleteMany({ where: { groupId } });

        if (existingIds.size) {
          const rows = data.memberIds
            .filter((m) => existingIds.has(m.id))
            .map(({ id, workRole }) => ({
              courseMemberId: id,
              groupId,
              workRole: String(workRole ?? "").trim() || "STUDENT",
            }));
          if (rows.length) await tx.groupMember.createMany({ data: rows });
        }
      }

      // 3) Replace advisors/co-advisors if provided
      const replaceAdvisors = async (
        ids: number[] | undefined,
        role: "ADVISOR" | "CO_ADVISOR"
      ) => {
        if (ids === undefined) return; // not provided → do nothing
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
        // delete current rows for this role
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

      // 4) Return fresh group with relations
      const updated = await tx.group.findUnique({
        where: { id: groupId },
        include: {
          members: true,
          advisors: true,
          submissions: true,
          course: true,
        },
      });
      return updated!;
    });
  }
}



export default GroupModel;
