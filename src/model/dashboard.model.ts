import { group } from "console";
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
  static async getGroupInformation(userId: string, courseId: number) {
    const groupInfo = await prisma.group.findMany({
      where: {
        members: { some: { courseMember: { userId } } },
        courseId,
      },
      select: {
        id: true,
        codeNumber: true,
        projectName: true,
        productName: true,
        company: true,
        members: {include: { courseMember: { include: { user: true } } }},
        advisors: {include: { courseMember: { include: { user: true } } }},
      },
    });
    return groupInfo;
  }

  static async getGroupInformationforAdvisor(userId: string, courseId: number) {
    const groupInfo = await prisma.group.findMany({
      where: {
        advisors: { some: { courseMember: { userId } } },
        courseId,
    },
      select: {
        id: true,
        codeNumber: true,
        projectName: true,
        productName: true,
        company: true,
        members: {include: { courseMember: { include: { user: true } } }},
        advisors: {include: { courseMember: { include: { user: true } } }},
  }}    );
    return groupInfo;
  }

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
            name: true,
            email: true,
            role: true,
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
        where: { courseId, user: { role: "LECTURER" } },
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
          name: course.createdBy.name,
          email: course.createdBy.email,
          role: course.createdBy.role,
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
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
  if (!base) return null;

  // ✅ Only fetch group if groupId is provided
  let group:
    | {
        id: number;
        codeNumber: string | null;
        projectName: string;
        productName: string | null;
        company: string | null;
        _count: { members: number; advisors: number };
      }
    | null = null;

  if (typeof opts?.groupId === "number") {
    group = await prisma.group.findFirst({
      where: { id: opts.groupId, courseId }, // findFirst accepts multiple conditions
      select: {
        id: true,
        codeNumber: true,
        projectName: true,
        productName: true,
        company: true,
        _count: {
          select: {
            members: true,
            advisors: true,
          },
        },
      },
    });
    // If you prefer 404 when group not found in this course, you could throw here.
  }

  const [totalStudents, totalAdvisors, totalGroups, totalAssignments, rollup] =
    await Promise.all([
      prisma.courseMember.count({
        where: { courseId, user: { role: "STUDENT" } },
      }),
      prisma.courseMember.count({
        // If your enum is ADVISOR (not LECTURER), change accordingly
        where: { courseId, user: { role: "LECTURER" } },
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
        name: base.createdBy.name,
        email: base.createdBy.email,
        role: base.createdBy.role,
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
    group, // will be null if no groupId provided
  };
}
}

export default DashboardModel;
