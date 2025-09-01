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
      user: { role: Role.ADVISOR },
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

/**
 * Adds a single user to a course, idempotently.
 * Returns { created: boolean, member: CourseMember & { user, course } }
 */
export const addMember = async (courseId: number, userId: number) => {
  // If exists, return it (created=false)
  const existing = await prisma.courseMember.findFirst({
    where: { courseId, userId },
    include: { user: true, course: true },
  });
  if (existing) {
    return { created: false, member: existing };
  }

  // Else create and return (created=true)
  const created = await prisma.courseMember.create({
    data: { courseId, userId },
    include: { user: true, course: true },
  });
  return { created: true, member: created };
};

export const deleteCourseMember = async (courseMemberId: number) => {
  return prisma.$transaction(async (tx) => {
    const cm = await tx.courseMember.findUnique({
      where: { id: courseMemberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            surname: true,
            role: true,
          },
        },
        course: { select: { id: true, name: true } },
        // Pull detailed relations so we can show which groups are blocking deletion
        groupMembers: {
          include: {
            group: {
              select: {
                id: true,
                codeNumber: true,
                projectName: true,
                productName: true,
                company: true,
              },
            },
          },
        },
        groupAdvisors: {
          include: {
            group: {
              select: {
                id: true,
                codeNumber: true,
                projectName: true,
                productName: true,
                company: true,
              },
            },
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

    if (!cm) {
      const err: any = new Error("Course member not found");
      err.status = 404;
      throw err;
    }

    const deps = cm._count;
    if (
      deps.groupMembers > 0 ||
      deps.groupAdvisors > 0 ||
      deps.activityLogs > 0
    ) {
      const err: any = new Error(
        "Cannot delete course member because there are related records"
      );
      err.status = 409;
      err.details = {
        groupMembers: deps.groupMembers,
        groupAdvisors: deps.groupAdvisors,
        activityLogs: deps.activityLogs,
        memberOfGroups: cm.groupMembers.map((gm) => ({
          id: gm.group.id,
          codeNumber: gm.group.codeNumber,
          projectName: gm.group.projectName,
          productName: gm.group.productName,
          company: gm.group.company,
        })),
        advisorOfGroups: cm.groupAdvisors.map((ga) => ({
          id: ga.group.id,
          codeNumber: ga.group.codeNumber,
          projectName: ga.group.projectName,
          productName: ga.group.productName,
          company: ga.group.company,
          advisorRole: "ADVISOR", // or ga.advisorRole if you include it in select
        })),
      };
      throw err;
    }

    // Safe to delete
    await tx.courseMember.delete({ where: { id: courseMemberId } });

    return {
      deleted: true,
      courseMemberId,
      user: cm.user,
      course: cm.course,
    };
  });
};