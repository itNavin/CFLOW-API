import { prisma } from "../prisma";
import type { CoursePayload } from "../types/payload/course.type";
import { ClassProgram } from "../types/program";

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

  static async getCourseByName(name: string) {
    return prisma.course.findFirst({
      where: { name },
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

  static async deleteCourse(courseId: string) {
    return prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });
      if (!course) {
        const err: any = new Error("Course not found");
        err.status = 404;
        throw err;
      }

      const counts: Record<string, number> = {};

      counts.feedbackFiles = (
        await tx.feedbackFile.deleteMany({
          where: { feedback: { submission: { assignment: { courseId } } } },
        })
      ).count;

      counts.submissionFiles = (
        await tx.submissionFile.deleteMany({
          where: { submission: { assignment: { courseId } } },
        })
      ).count;

      counts.feedbacks = (
        await tx.feedback.deleteMany({
          where: { submission: { assignment: { courseId } } },
        })
      ).count;

      counts.submissions = (
        await tx.submission.deleteMany({
          where: { assignment: { courseId } },
        })
      ).count;

      counts.allowedFileTypes = (
        await tx.allowedFileType.deleteMany({
          where: { deliverable: { assignment: { courseId } } },
        })
      ).count;

      counts.deliverables = (
        await tx.deliverable.deleteMany({
          where: { assignment: { courseId } },
        })
      ).count;

      counts.assignmentDueDates = (
        await tx.assignmentDueDate.deleteMany({
          where: { assignment: { courseId } },
        })
      ).count;

      counts.groupMembers = (
        await tx.groupMember.deleteMany({
          where: { group: { courseId } },
        })
      ).count;

      counts.groupAdvisors = (
        await tx.groupAdvisor.deleteMany({
          where: { group: { courseId } },
        })
      ).count;

      counts.groups = (
        await tx.group.deleteMany({
          where: { courseId },
        })
      ).count;

      // if (tx.activityLog) {
      //   counts.activityLogs = (
      //     await tx.activityLog.deleteMany({
      //       where: { courseId },
      //     })
      //   ).count;
      // }

      counts.announcements = (
        await tx.announcement.deleteMany({
          where: { courseId },
        })
      ).count;

      counts.files = (
        await tx.file.deleteMany({
          where: { courseId },
        })
      ).count;

      counts.courseMembers = (
        await tx.courseMember.deleteMany({
          where: { courseId },
        })
      ).count;

      counts.assignments = (
        await tx.assignment.deleteMany({
          where: { courseId },
        })
      ).count;

      await tx.course.delete({ where: { id: courseId } });

      return { counts };
    });
  }
}

export default CourseModel;
