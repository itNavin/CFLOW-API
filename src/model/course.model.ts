import { prisma } from "../prisma";
import type { CoursePayload } from "../types/payload/course.type";
import { ClassProgram, Program } from "../types/program";

class CourseModel {
  static async createCourse(
    name: string,
    description: string,
    program: "CS" | "DSI",
    createdById: string
  ) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: createdById },
        select: { id: true },
      });
      if (!user) {
        const err: any = new Error(`User ${createdById} does not exist`);
        err.status = 400;
        throw err;
      }

      const course = await tx.course.create({
        data: { name, description, program, createdById },
      });

      try {
        await tx.courseMember.create({
          data: {
            courseId: course.id,
            userId: createdById,
          },
        });
      } catch (e: any) {
        if (e?.code !== "P2002") throw e;
      }

      return course;
    });
  }

  static async updateCourseById(body: CoursePayload.updateCourseBody) {
    const course = await prisma.course.update({
      where: { id: body.courseId },
      data: { name: body.name, description: body.description },
    });
    return course;
  }

  static async getStaffCourses(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { program: true },
    });
    if (!user) throw new Error("AUTHENTICATION_ERROR: user not found");

    const where =
      user.program === ClassProgram.BOTH
        ? {}
        : { program: { in: [user.program, ClassProgram.BOTH] } };

    return prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        program: true,
      },
    });
  }

  static async getCourseByUser(userId: string) {
    const rows = await prisma.courseMember.findMany({
      where: { userId },
      select: {
        course: {
          select: { id: true, name: true, description: true, program: true },
        },
      },
      orderBy: { course: { createdAt: "desc" } },
    });
    return rows.map((r) => r.course);
  }

  static async getCourseById(courseId: string) {
    return prisma.course.findUnique({
      where: { id: courseId },
    });
  }
}

export default CourseModel;
