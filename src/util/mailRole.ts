import { prisma } from "src/prisma";

export const mailRoles = {
  getStaff() {
    return prisma.user.findMany({
      where: {
        role: "staff",
      },
    });
  },
  getLecturers() {
    return prisma.user.findMany({
      where: {
        role: "lecturer",
      },
    });
  },
  getStudents() {
    return prisma.user.findMany({
      where: {
        role: "student",
      },
    });
  },
  getStaffInCourse(courseId: string) {
    return prisma.courseMember.findMany({
      where: {
        courseId: courseId,
        user: {
          role: "staff",
        },
      },
      select: {
        user: true,
      },
    });
  },
  getLecturersInCourse(courseId: string) {
    return prisma.courseMember.findMany({
      where: {
        courseId: courseId,
        user: {
          role: "lecturer",
        },
      },
      select: {
        user: true,
      },
    });
  },
  getStudentsInCourse(courseId: string) {
    return prisma.courseMember.findMany({
      where: {
        courseId: courseId,
        user: {
          role: "student",
        },
      },
      select: {
        user: true,
      },
    });
  },
  getStaffAndLecturersInCourse(courseId: string) {
    return prisma.courseMember.findMany({
      where: {
        courseId: courseId,
        user: {
          OR: [{ role: "staff" }, { role: "lecturer" }],
        },
      },
      select: {
        user: true,
      },
    });
  },
  getAllUsersInCourse(courseId: string) {
    return prisma.courseMember.findMany({
      where: {
        courseId: courseId,
      },
      select: {
        user: true,
      },
    });
  },
  getSingleUser(userId: string) {
    return prisma.user.findMany({
      where: {
        id: userId,
      },
    });
  },
  test(courseId: string) {
    return prisma.courseMember.findMany({
      where: {
        courseId: courseId,
        user: {
          id: "stf02",
        },
      },
      select: {
        user: true,
      },
    });
  },
  test2(userId: string) {
    return prisma.user.findMany({
      where: {
        id: userId,
      },
    });
  },
  coursename(courseId: string) {
    return prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        name: true,
      },
    });
  }
};
