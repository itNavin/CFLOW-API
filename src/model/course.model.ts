import { prisma } from "../prisma";

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

  static async getAllCourses() {
    return prisma.course.findMany();
  }

  static async getUserCourseOverview(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        classMemberships: {
          include: {
            course: true,
            groupMembers: {
              include: {
                group: true,
              },
            },
            groupAdvisors: {
              include: {
                group: true,
              },
            },
          },
        },
        createdClasses: true,
        createdAnnouncements: true,
        uploadedFiles: true,
      },
    });

    if (!user) return null;

    const courses = user.classMemberships.map((cm) => {
      const groupsAsMember = cm.groupMembers.map((gm) => ({
        id: gm.group.id,
        projectName: gm.group.projectName,
        productName: gm.group.productName,
        company: gm.group.company,
        workRole: gm.workRole,
      }));

      const groupsAsAdvisor = cm.groupAdvisors.map((ga) => ({
        id: ga.group.id,
        projectName: ga.group.projectName,
        productName: ga.group.productName,
        company: ga.group.company,
        advisorRole: ga.advisorRole,
      }));

      return {
        course: cm.course,
        groupsAsMember,
        groupsAsAdvisor,
      };
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      courses,
      extras: {
        createdClasses: user.createdClasses,
        createdAnnouncements: user.createdAnnouncements,
        uploadedFiles: user.uploadedFiles,
      },
    };
  }

  static async getCourseById(courseId: number) {
    return prisma.course.findUnique({
      where: { id: courseId },
    });
  }
}

export default CourseModel;
