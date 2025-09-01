import { prisma } from "../prisma";

export type SubmissionRollup = {
  NOT_SUBMITTED: number;
  SUBMITTED: number;
  REJECTED: number;
  APPROVED_WITH_FEEDBACK: number;
  FINAL: number;
  totalPairs: number;
};

function emptyRollup(): SubmissionRollup {
  return {
    NOT_SUBMITTED: 0,
    SUBMITTED: 0,
    REJECTED: 0,
    APPROVED_WITH_FEEDBACK: 0,
    FINAL: 0,
    totalPairs: 0,
  };
}

function nowAsDate(): Date {
  return new Date();
}

async function computeSubmissionRollup(
  courseId: number,
  opts?: { assignmentId?: number; groupId?: number; asOf?: Date }
): Promise<SubmissionRollup> {
  const { assignmentId, groupId } = opts ?? {};
  const asOf = opts?.asOf ?? nowAsDate();

  const [assignments, groups] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        courseId,
        ...(assignmentId ? { id: assignmentId } : {}),
        schedule: { lte: asOf },
      },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
    prisma.group.findMany({
      where: {
        courseId,
        ...(groupId ? { id: groupId } : {}),
      },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
  ]);

  if (assignments.length === 0 || groups.length === 0) {
    return { ...emptyRollup(), totalPairs: assignments.length * groups.length };
  }

  const assignmentIds = assignments.map((a) => a.id);
  const groupIds = groups.map((g) => g.id);
  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId: { in: assignmentIds },
      groupId: { in: groupIds },
    },
    select: {
      assignmentId: true,
      groupId: true,
      version: true,
      status: true,
      missed: true,
    },
    orderBy: [{ assignmentId: "asc" }, { groupId: "asc" }, { version: "desc" }],
  });

  const latest = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) {
    const key = `${s.assignmentId}:${s.groupId}`;
    if (!latest.has(key)) latest.set(key, s);
  }

  const rollup: SubmissionRollup = {
    ...emptyRollup(),
    totalPairs: assignmentIds.length * groupIds.length,
  };

  for (const aId of assignmentIds) {
    for (const gId of groupIds) {
      const s = latest.get(`${aId}:${gId}`);
      if (!s) {
        rollup.NOT_SUBMITTED++;
      } else {
        switch (s.status) {
          case "REJECTED":
            rollup.REJECTED++;
            break;
          case "APPROVED_WITH_FEEDBACK":
            rollup.APPROVED_WITH_FEEDBACK++;
            break;
          case "FINAL":
            rollup.FINAL++;
            break;
          case "SUBMITTED":
          default:
            rollup.SUBMITTED++;
            break;
        }
      }
    }
  }

  return rollup;
}

class DashboardModel {
  static async getCourseSummary(courseId: number, asOf?: Date) {
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
            id: true,
            prefix: true,
            name: true,
            surname: true,
            email: true,
          },
        },
      },
    });
    if (!course) return null;

    const [
      totalStudents,
      totalAdvisors,
      totalGroups,
      totalAssignments,
      rollup,
    ] = await Promise.all([
      prisma.courseMember.count({
        where: { courseId, user: { role: "STUDENT" } },
      }),
      prisma.courseMember.count({
        where: { courseId, user: { role: "ADVISOR" } },
      }),
      prisma.group.count({ where: { courseId } }),
      prisma.assignment.count({ where: { courseId } }),
      computeSubmissionRollup(courseId, { asOf }),
    ]);

    return {
      course: {
        id: course.id,
        name: course.name,
        description: course.description,
        program: course.program,
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
      submissions: {
        totalPairs: rollup.totalPairs,
        statusCounts: {
          NOT_SUBMITTED: rollup.NOT_SUBMITTED,
          SUBMITTED: rollup.SUBMITTED,
          REJECTED: rollup.REJECTED,
          APPROVED_WITH_FEEDBACK: rollup.APPROVED_WITH_FEEDBACK,
          FINAL: rollup.FINAL,
        },
      },
    };
  }

  static async getCourseSummaryFiltered(
    courseId: number,
    opts?: { assignmentId?: number; groupId?: number; asOf?: Date }
  ) {
    const base = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        name: true,
        description: true,
        program: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            prefix: true,
            name: true,
            surname: true,
            email: true,
          },
        },
      },
    });
    if (!base) return null;

    const [
      totalStudents,
      totalAdvisors,
      totalGroups,
      totalAssignments,
      rollup,
    ] = await Promise.all([
      prisma.courseMember.count({
        where: { courseId, user: { role: "STUDENT" } },
      }),
      prisma.courseMember.count({
        where: { courseId, user: { role: "ADVISOR" } },
      }),
      prisma.group.count({ where: { courseId } }),
      prisma.assignment.count({ where: { courseId } }),
      computeSubmissionRollup(courseId, opts),
    ]);

    return {
      course: {
        id: base.id,
        name: base.name,
        description: base.description,
        program: base.program,
        createdAt: base.createdAt,
        createdBy: {
          id: base.createdBy.id,
          fullName:
            `${base.createdBy.prefix} ${base.createdBy.name} ${base.createdBy.surname}`.trim(),
          email: base.createdBy.email,
        },
      },
      totals: {
        students: totalStudents,
        advisors: totalAdvisors,
        groups: totalGroups,
        assignments: totalAssignments,
      },
      submissions: {
        totalPairs: rollup.totalPairs,
        statusCounts: {
          NOT_SUBMITTED: rollup.NOT_SUBMITTED,
          SUBMITTED: rollup.SUBMITTED,
          REJECTED: rollup.REJECTED,
          APPROVED_WITH_FEEDBACK: rollup.APPROVED_WITH_FEEDBACK,
          FINAL: rollup.FINAL,
        },
        
      },
    };
  }
}

export default DashboardModel;
