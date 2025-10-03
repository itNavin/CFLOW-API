import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";

export class GroupModel {
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
      const codeNumber =
        typeof data.codeNumber === "string" && data.codeNumber.trim() !== ""
          ? data.codeNumber.trim()
          : null;
      const projectName = data.projectName.trim();
      const productName =
        typeof data.productName === "string" && data.productName.trim() !== ""
          ? data.productName.trim()
          : null;

      // --- Uniqueness checks ---
      if (codeNumber) {
        const exists = await tx.group.findFirst({
          where: { courseId: data.courseId, codeNumber },
          select: { id: true },
        });
        if (exists) {
          const err: any = new Error("Duplicate codeNumber in this course");
          err.status = 409;
          throw err;
        }
      }

      {
        const exists = await tx.group.findFirst({
          where: { courseId: data.courseId, projectName },
          select: { id: true },
        });
        if (exists) {
          const err: any = new Error("Duplicate projectName in this course");
          err.status = 409;
          throw err;
        }
      }

      if (productName) {
        const exists = await tx.group.findFirst({
          where: { courseId: data.courseId, productName },
          select: { id: true },
        });
        if (exists) {
          const err: any = new Error("Duplicate productName in this course");
          err.status = 409;
          throw err;
        }
      }

      // --- Helpers ---
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

      // --- Members validation ---
      const memberPayload = data.memberIds ?? [];
      const memberIds = memberPayload.map((m) => m.id);

      const memberIdSet = new Set(memberIds);
      if (memberIdSet.size !== memberIds.length) {
        const dupes = memberIds.filter((id, i) => memberIds.indexOf(id) !== i);
        const err: any = new Error(
          `Duplicate memberIds in request: ${[...new Set(dupes)].join(", ")}`
        );
        err.status = 400;
        throw err;
      }

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

      if (memberIds.length) {
        const roles = await tx.courseMember.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, user: { select: { role: true } } },
        });
        const notStudents = roles
          .filter((r) => r.user.role !== "student")
          .map((r) => r.id);
        if (notStudents.length) {
          const err: any = new Error(
            `These courseMemberIds are not students: ${notStudents.join(", ")}`
          );
          err.status = 400;
          throw err;
        }
      }

      if (memberIds.length) {
        const alreadyGrouped = await tx.groupMember.findMany({
          where: {
            courseMemberId: { in: memberIds },
            group: { courseId: data.courseId },
          },
          select: { courseMemberId: true, groupId: true },
        });
        if (alreadyGrouped.length) {
          const details = alreadyGrouped
            .map((g) => `${g.courseMemberId}→${g.groupId}`)
            .join(", ");
          const err: any = new Error(
            `Each student can have only 1 group: already in group(s): ${details}`
          );
          err.status = 409;
          throw err;
        }
      }

      // --- Advisors validation (existence in course only; add role checks if needed) ---
      const advisorIds = Array.from(new Set(data.advisorIds ?? []));
      const coAdvisorIds = Array.from(new Set(data.coAdvisorIds ?? []));

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

      // --- Create group ---
      const newGroup = await tx.group.create({
        data: {
          courseId: data.courseId,
          codeNumber,
          projectName,
          productName: productName ?? undefined,
          company: data.company ?? undefined,
        },
      });

      // --- Backfill AssignmentDueDate for existing assignments in this course ---
      // Uses the assignment's dueDate field
      const existingAssignments = await tx.assignment.findMany({
        where: { courseId: data.courseId },
        select: { id: true, dueDate: true },
      });

      if (existingAssignments.length) {
        await tx.assignmentDueDate.createMany({
          data: existingAssignments.map((a) => ({
            assignmentId: a.id,
            groupId: newGroup.id,
            dueDate: a.dueDate,
          })),
          skipDuplicates: true, // respects @@unique([assignmentId, groupId])
        });
      }

      // --- Insert members ---
      if (memberPayload.length) {
        const rows = memberPayload
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

      // --- Insert advisors / co-advisors ---
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

  static async getStudentNoInGroup(courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) throw new Error("COURSE_NOT_FOUND");

    const members = await prisma.courseMember.findMany({
      where: {
        courseId,
        user: { role: "student" },
        groupMembers: { none: {} },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            program: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        user: { name: "asc" },
      },
    });

    return members.map((m) => ({
      courseMemberId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.user.role,
      program: m.user.program,
      createdAt: m.user.createdAt,
    }));
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
  static async deleteGroup(groupId: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const group = await tx.group.findUnique({
        where: { id: groupId },
        select: { id: true },
      });
      if (!group) return false;

      const submissions = await tx.submission.findMany({
        where: { groupId },
        select: { id: true },
      });
      const submissionIds = submissions.map((s) => s.id);

      if (submissionIds.length) {
        await tx.submissionFile.deleteMany({
          where: { submissionId: { in: submissionIds } },
        });

        const feedbacks = await tx.feedback.findMany({
          where: { submissionId: { in: submissionIds } },
          select: { id: true },
        });
        const feedbackIds = feedbacks.map((f) => f.id);

        if (feedbackIds.length) {
          await tx.feedbackFile.deleteMany({
            where: { feedbackId: { in: feedbackIds } },
          });
          await tx.feedback.deleteMany({ where: { id: { in: feedbackIds } } });
        }

        

        await tx.submission.deleteMany({
          where: { id: { in: submissionIds } },
        });
      }

      await tx.assignmentDueDate.deleteMany({ where: { groupId } });
      await tx.groupAdvisor.deleteMany({ where: { groupId } });
      await tx.groupMember.deleteMany({ where: { groupId } });

      

      const del = await tx.group.deleteMany({ where: { id: groupId } });
      return del.count > 0;
    });
  }
}

export default GroupModel;
