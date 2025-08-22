import { prisma } from "../prisma";

/** Rollup of latest submission status per (assignment, group) pair */
export type SubmissionRollup = {
  NOT_SUBMITTED: number;
  SUBMITTED: number;
  REJECTED: number;
  APPROVED_WITH_FEEDBACK: number;
  FINAL: number;
  totalPairs: number; // number of (assignment, group) pairs considered
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

/**
 * Compute submission status rollup across (assignment, group) pairs.
 * - Excludes assignments whose schedule is in the future (schedule > asOf).
 * - For each (assignmentId, groupId):
 *    - If no submission OR latest submission.missed === true -> NOT_SUBMITTED
 *    - Else bucket by latest submission.status
 */
async function computeSubmissionRollup(
  courseId: number,
  opts?: { assignmentId?: number; groupId?: number; asOf?: Date }
): Promise<SubmissionRollup> {
  const { assignmentId, groupId } = opts ?? {};
  const asOf = opts?.asOf ?? nowAsDate();

  // 1) Pick assignments (schedule <= asOf) and groups within the course, honoring filters
  const [assignments, groups] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        courseId,
        ...(assignmentId ? { id: assignmentId } : {}),
        schedule: { lte: asOf }, // <<< exclude future assignments
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

  // 2) Pull all submissions for these ids; we'll keep only the latest per pair (max version)
  const submissions = await prisma.submission.findMany({
    where: {
      assignmentId: { in: assignmentIds },
      groupId: { in: groupIds },
    },
    select: {
      assignmentId: true,
      groupId: true,
      version: true,
      status: true, // "SUBMITTED" | "REJECTED" | "APPROVED_WITH_FEEDBACK" | "FINAL"
      missed: true,
    },
    orderBy: [{ assignmentId: "asc" }, { groupId: "asc" }, { version: "desc" }],
  });

  // 3) Reduce to latest submission per (assignmentId, groupId)
  const latest = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) {
    const key = `${s.assignmentId}:${s.groupId}`;
    if (!latest.has(key)) latest.set(key, s); // first is latest due to ordering
  }

  // 4) Classify each (assignment, group) pair
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
  /** Unfiltered (whole course) summary + submission rollup (excluding future assignments) */
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

  /** Filtered summary, same shape, but rollup scoped by assignmentId/groupId (and still excludes future schedule) */
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
        filters: {
          assignmentId: opts?.assignmentId,
          groupId: opts?.groupId,
          asOf: opts?.asOf?.toISOString(),
        },
      },
    };
  }
}

export default DashboardModel;
