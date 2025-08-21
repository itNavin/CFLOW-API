import { prisma } from "../prisma";
import { Role } from "@prisma/client";


export const getAllCourseMembers = async (courseId: number) => {
  return await prisma.courseMember.findMany({
    where: {
      courseId,
    },
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

export const addMember = async (courseId: number, userId: number) => {
  const existing = await prisma.courseMember.findFirst({
    where: { courseId, userId },
    select: { id: true },
  });
  if (existing) {
    return existing; // or throw new Error("ALREADY_MEMBER")
  }

  return prisma.courseMember.create({
    data: { courseId, userId },
    include: {
      user: true,
      course: true,
    },
  });
};

