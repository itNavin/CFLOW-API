import { prisma } from "src/prisma";
import { SubmissionStatus } from "@prisma/client";

const NOT_SUBMITTED = "NOT_SUBMITTED" as const;
type AllowedStatus = SubmissionStatus | typeof NOT_SUBMITTED;

type Params = {
  courseId: string;
  assignmentId?: string;
  groupId?: string;
  status?: AllowedStatus;
};

type GroupEntry = {
  groupId: string;
  codeNumber: string | null;
  projectName: string;
  status: AllowedStatus;
  submissionId: string | null;
  version: number | null;
  submittedAt: string | null; 
};

type AssignmentEntry = {
  assignmentId: string;
  assignmentName: string;
  dueDate: string; 
  groups: GroupEntry[];
};

export class StatusModel {
  static async getAllGroupStatusInCourse(
    params: Params
  ): Promise<AssignmentEntry[]> {
    const { courseId, assignmentId, groupId, status } = params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) throw new Error("COURSE_NOT_FOUND");

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId,
        ...(assignmentId ? { id: assignmentId } : {}),
      },
      select: {
        id: true,
        name: true,
        dueDate: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (assignments.length === 0) return [];

    const groups = await prisma.group.findMany({
      where: {
        courseId,
        ...(groupId ? { id: groupId } : {}),
      },
      select: {
        id: true,
        codeNumber: true,
        projectName: true,
      },
      orderBy: [{ codeNumber: "asc" }, { projectName: "asc" }],
    });

    if (groups.length === 0) {
      return [];
    }

    const assignmentIds = assignments.map((a) => a.id);
    const groupIds = groups.map((g) => g.id);

    const submissions = await prisma.submission.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        groupId: { in: groupIds },
      },
      select: {
        id: true,
        assignmentId: true,
        groupId: true,
        status: true,
        version: true,
        submittedAt: true,
      },
      orderBy: [
        { assignmentId: "asc" },
        { groupId: "asc" },
        { version: "desc" },
        { submittedAt: "desc" },
      ],
    });

    const latestByPair = new Map<
      string,
      {
        id: string;
        status: SubmissionStatus;
        version: number;
        submittedAt: Date | null;
      }
    >();
    for (const s of submissions) {
      const key = `${s.assignmentId}:${s.groupId}`;
      if (!latestByPair.has(key)) {
        latestByPair.set(key, {
          id: s.id,
          status: s.status,
          version: s.version ?? 1,
          submittedAt: s.submittedAt ?? null,
        });
      }
    }

    const byAssignment: AssignmentEntry[] = assignments.map((a) => {
      const groupsForAssignment: GroupEntry[] = groups.map((g) => {
        const key = `${a.id}:${g.id}`;
        const latest = latestByPair.get(key);
        if (latest) {
          return {
            groupId: g.id,
            codeNumber: g.codeNumber ?? null,
            projectName: g.projectName,
            status: latest.status,
            submissionId: latest.id,
            version: latest.version ?? null,
            submittedAt: latest.submittedAt
              ? latest.submittedAt.toISOString()
              : null,
          };
        } else {
          return {
            groupId: g.id,
            codeNumber: g.codeNumber ?? null,
            projectName: g.projectName,
            status: NOT_SUBMITTED,
            submissionId: null,
            version: null,
            submittedAt: null,
          };
        }
      });

      return {
        assignmentId: a.id,
        assignmentName: a.name,
        dueDate: a.dueDate.toISOString(),
        groups: groupsForAssignment,
      };
    });

    let filtered = byAssignment;
    if (status) {
      filtered = byAssignment
        .map((a) => ({
          ...a,
          groups: a.groups.filter((g) => g.status === status),
        }))
        .filter((a) => a.groups.length > 0); 
    }

    return filtered;
  }
}
