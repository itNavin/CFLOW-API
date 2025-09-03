import { prisma } from "../prisma";

class UserModel {
  // static async createUser(
  //   email: string,
  //   passwordHash: string,
  //   prefix: string,
  //   name: string,
  //   surname: string,
  //   role: "STUDENT" | "LECTURER" | "STAFF" | "SUPER_ADMIN"
  // ) {
  //   const newUser = await prisma.user.create({
  //     data: {
  //       email,
  //       name,
  //       role,
  //     },
  //   });
  //   return newUser;
  // }

  // static async getAllUsers() {
  //   const users = await prisma.user.findMany();
  //   return users;
  // }

  // static async getUserById(id: number) {
  //   const user = await prisma.user.findUnique({
  //     where: { id },
  //   });
  //   return user;
  // }

  /**
   * Returns the student's project (group) inside a course.
   * Throws with {status, message} for well-defined error cases.
   */
  static async getStudentProjectByCourse(userId: string, courseId: number) {
    // Ensure user is enrolled in the course and fetch their group memberships
    const cm = await prisma.courseMember.findFirst({
      where: { courseId, userId },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            role: true,
            name: true,
            email: true,
          },
        },
        course: { select: { id: true, name: true, program: true } },
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
      },
    });

    if (!cm) {
      const err: any = new Error("Not enrolled in this course");
      err.status = 404;
      throw err;
    }

    if (cm.user.role !== "STUDENT") {
      const err: any = new Error("Only STUDENT can have a personal project");
      err.status = 403;
      throw err;
    }

    const groups = cm.groupMembers.map((gm) => gm.group);

    if (groups.length === 0) {
      const err: any = new Error("You are not assigned to any group yet");
      err.status = 404;
      throw err;
    }
    if (groups.length > 1) {
      const err: any = new Error(
        `You are assigned to multiple groups in this course: ${groups
          .map((g) => `#${g.codeNumber ?? g.id} (${g.projectName})`)
          .join(", ")}`
      );
      err.status = 409;
      throw err;
    }

    const g = groups[0];

    return {
      
      group: {
        id: g.id,
        codeNumber: g.codeNumber,
        projectName: g.projectName,
        productName: g.productName, // CS only
        company: g.company, // DSI only
      },
    };
  }
}

export default UserModel;
