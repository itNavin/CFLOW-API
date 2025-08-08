import { prisma } from ".."; // adjust path if necessary
import { Role } from "../generated/prisma";

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
  return await prisma.courseMember.findMany({
    where: {
      courseId,
      user: {
        role: Role.ADVISOR,
      },
    },
    include: {
      user: true,
      course: true,
    },
  });
};

export const getStudentMembers = async (courseId: number) => {
  return await prisma.courseMember.findMany({
    where: {
      courseId,
      user: {
        role: Role.STUDENT,
      },
    },
    include: {
      user: true,
      course: true,
    },
  });
};
