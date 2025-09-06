import { prisma } from "../prisma";
import { Role } from "@prisma/client";

export const getAllCourseMembers = async (courseId: number) => {
  return await prisma.courseMember.findMany({
    where: { courseId },
    include: {
      user: true,
      course: true,
    },
  });
};

export const getAdvisorMembers = async (courseId: number) => {
  const advisors = await prisma.courseMember.findMany({
    where: {
      courseId,
      user: { role: Role.LECTURER },
    },
    include: {
      user: true,
      groupAdvisors: {
        include: {
          group: {
            select: {
              id: true,
              projectName: true,
              productName: true,
              company: true,
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return advisors.map((a) => ({
    id: a.id,
    courseId: a.courseId,
    user: a.user,
    projects: a.groupAdvisors.map((ga) => ga.group),
  }));
};

export const getAdvisorNotInCourse = async (courseId: number) => {
  if (!Number.isFinite(courseId)) throw new Error("Invalid courseId");

  return prisma.user.findMany({
    where: {
      role: Role.LECTURER, 
      classMemberships: {
        none: { courseId }, 
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
};

export const getStudentsNotInCourse = async (courseId: number) => {
  if (!Number.isFinite(courseId)) throw new Error("Invalid courseId");

  return prisma.user.findMany({
    where: {
      role: Role.STUDENT, 
      classMemberships: {
        none: { courseId }, 
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
};

export const getStudentMembers = async (courseId: number) => {
  return prisma.courseMember.findMany({
    where: {
      courseId,
      user: { role: Role.STUDENT },
    },
    include: {
      user: true,
      groupMembers: {
        include: {
          group: true,
        },
      },
    },
  });
};

export const addMember = async (courseId: number, userId: string) => {
  const existing = await prisma.courseMember.findFirst({
    where: { courseId, userId },
    include: { user: true, course: true },
  });
  if (existing) {
    return { created: false, member: existing };
  }

  const created = await prisma.courseMember.create({
    data: { courseId, userId },
    include: { user: true, course: true },
  });
  return { created: true, member: created };
};

export type BulkDeleteCMResult = {
  requestedIds: number[];
  deletedIds: number[];
  notFoundIds: number[];
  blocked: Array<{
    courseMemberId: number;
    userId: string;
    userName: string;
    reasons: {
      groupMembers: number;
      groupAdvisors: number;
      activityLogs: number;
    };
  }>;
};

export const deleteCourseMembersBulk = async (
  courseMemberIdsInput: number[]
): Promise<BulkDeleteCMResult> => {
  // Validate
  if (
    !Array.isArray(courseMemberIdsInput) ||
    courseMemberIdsInput.length === 0
  ) {
    const err: any = new Error("courseMemberIds must be a non-empty array");
    err.status = 400;
    throw err;
  }
  const courseMemberIds = [
    ...new Set(
      courseMemberIdsInput
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  if (courseMemberIds.length === 0) {
    const err: any = new Error("No valid courseMemberIds provided");
    err.status = 400;
    throw err;
  }

  // Load members + linkage counts
  const cms = await prisma.courseMember.findMany({
    where: { id: { in: courseMemberIds } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      _count: {
        select: {
          groupMembers: true,
          groupAdvisors: true,
          activityLogs: true,
        },
      },
    },
  });

  const foundIds = new Set(cms.map((cm) => cm.id));
  const notFoundIds = courseMemberIds.filter((id) => !foundIds.has(id));

  const deletableIds: number[] = [];
  const blocked: BulkDeleteCMResult["blocked"] = [];

  for (const cm of cms) {
    const deps = cm._count;
    const hasLinks =
      deps.groupMembers > 0 || deps.groupAdvisors > 0 || deps.activityLogs > 0;

    if (hasLinks) {
      blocked.push({
        courseMemberId: cm.id,
        userId: cm.user.id,
        userName: cm.user.name,
        reasons: {
          groupMembers: deps.groupMembers,
          groupAdvisors: deps.groupAdvisors,
          activityLogs: deps.activityLogs,
        },
      });
    } else {
      deletableIds.push(cm.id);
    }
  }

  if (deletableIds.length > 0) {
    await prisma.courseMember.deleteMany({
      where: { id: { in: deletableIds } },
    });
  }

  return {
    requestedIds: courseMemberIds,
    deletedIds: deletableIds,
    notFoundIds,
    blocked,
  };
};
