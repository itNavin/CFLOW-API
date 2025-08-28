import { prisma } from "../prisma";

class CourseModel {
  static async createCourse(
    name: string,
    description: string,
    program: "CS" | "DSI",
    createdById: number
  ) {
    return prisma.course.create({
      data: { name, description, program, createdById },
    });
  }

  static async getAllCourses() {
    return prisma.course.findMany();
  }

  static async getUserCourseOverview(userId: number) {
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
        prefix: user.prefix,
        name: user.name,
        surname: user.surname,
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
}

export default CourseModel;
