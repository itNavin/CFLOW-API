import { prisma } from "../prisma";
import { Role } from "@prisma/client";

import { CourseMemberPayload } from "src/types/payload/courseMember.type";
import { ClassProgram } from "src/types/program";

async function ensureCourseExists(courseId: string) {
  const exists = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!exists) throw new Error("COURSE_NOT_FOUND");
}

export const getStaffMembers = async (courseId: string) => {
  await ensureCourseExists(courseId);
  const staffs = await prisma.courseMember.findMany({
    where: {
      courseId,
      user: { role: Role.staff },
    },
    include:{
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          program: true,
          createdAt: true,
        },
      }
    },
    orderBy: { id: "asc" },
  });
  return staffs;
}

export const getStaffNotInCourse = async (courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId.trim() },
    select: { id: true },
  });
  if (!course) throw new Error("COURSE_NOT_FOUND");

  const enrolled = await prisma.courseMember.findMany({
    where: { courseId: course.id },
    select: { userId: true },
  });
  const enrolledUserIds = enrolled.map((r) => r.userId);

  return prisma.user.findMany({
    where: {
      role: "staff", 
      id: { notIn: enrolledUserIds.length ? enrolledUserIds : ["___none___"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      program: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
};

export const getAdvisorMembers = async (courseId: string) => {
  await ensureCourseExists(courseId);

  const advisors = await prisma.courseMember.findMany({
    where: {
      courseId,
      user: { role: Role.lecturer },
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

export const getAdvisorNotInCourse = async (courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { program: true },
  });
  if (!course) throw new Error("COURSE_NOT_FOUND");

  return prisma.user.findMany({
    where: {
      role: Role.lecturer,
      classMemberships: {
        none: { courseId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      program: true,
      createdAt: true,
    },
    orderBy: [
      { name: "asc" },
    ],
  });
};

export const getStudentMembers = async (courseId: string) => {
  await ensureCourseExists(courseId);

  return prisma.courseMember.findMany({
    where: {
      courseId,
      user: { role: Role.student },
    },
    include: {
      user: true,
      groupMembers: {
        include: { group: true },
      },
    },
  });
};

export const getStudentsNotInCourse = async (courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { program: true },
  });
  if (!course) throw new Error("COURSE_NOT_FOUND");

  const whereProgram =
    course.program === ClassProgram.BOTH
      ? undefined
      : { in: [course.program, ClassProgram.BOTH] };

  return prisma.user.findMany({
    where: {
      role: Role.student,
      ...(whereProgram ? { program: whereProgram } : {}),
      classMemberships: {
        none: { courseId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      program: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
};

export const addMembers = async (courseId: string, userId: string) => {
  await ensureCourseExists(courseId);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

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

export const deleteCourseMembers = async (
  courseMemberIds: string[]
): Promise<CourseMemberPayload.BulkDeleteCMResult> => {
  const deletedIds: string[] = [];
  const notFoundIds: string[] = [];
  const blocked: CourseMemberPayload.BulkDeleteCMResult["blocked"] = [];

  await prisma.$transaction(async (tx) => {
    for (const id of courseMemberIds) {
      const cm = await tx.courseMember.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true } },
          _count: {
            select: {
              groupMembers: true,
              groupAdvisors: true,
            },
          },
        },
      });

      if (!cm) {
        notFoundIds.push(id);
        continue;
      }

      await tx.groupMember.deleteMany({ where: { courseMemberId: id } });
      await tx.groupAdvisor.deleteMany({ where: { courseMemberId: id } });

      try {
        await tx.courseMember.delete({ where: { id } });
        deletedIds.push(id);
      } catch (e: any) {
        if (e?.code === "P2003") {
          blocked.push({
            courseMemberId: cm.id,
            userId: cm.user.id,
            userName: cm.user.name,
            reasons: {
              groupMembers: cm._count.groupMembers,
              groupAdvisors: cm._count.groupAdvisors,
            },
          });
        } else {
          throw e;
        }
      }
    }
  });

  return {
    requestedIds: courseMemberIds,
    deletedIds,
    notFoundIds,
    blocked,
  };
};
