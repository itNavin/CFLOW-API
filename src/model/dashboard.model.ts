import { prisma } from "../prisma";

class DashboardModel {
  static async getCourseSummary(courseId: number) {
    // fetch the course meta first
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        name: true,
        description: true,
        program: true,
        createdAt: true,
        createdBy: {
          select: {
            prefix: true,
            name: true,
            surname: true,
            email: true,
            id: true,
          },
        },
      },
    });

    if (!course) return null;

    // compute totals in parallel
    const [totalStudents, totalAdvisors, totalGroups, totalAssignments] =
      await prisma.$transaction([
        prisma.courseMember.count({
          where: { courseId, user: { role: "STUDENT" } },
        }),
        prisma.courseMember.count({
          where: { courseId, user: { role: "ADVISOR" } },
        }),
        prisma.group.count({ where: { courseId } }),
        prisma.assignment.count({ where: { courseId } }),
      ]);

    return {
      course: {
        id: course.id,
        name: course.name,
        description: course.description,
        program: course.program, // "CS" | "DSI"
        createdAt: course.createdAt,
        createdBy: {
          id: course.createdBy.id,
          fullName:
            `${course.createdBy.prefix} ${course.createdBy.name} ${course.createdBy.surname}`.trim(),
          email: course.createdBy.email,
        },
      },
      totals: {
        students: totalStudents,
        advisors: totalAdvisors,
        groups: totalGroups,
        assignments: totalAssignments,
      },
    };
  }
}

export default DashboardModel;
