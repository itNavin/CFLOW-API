import { prisma } from "../prisma";
import { MIME_TO_EXT } from "../util/filenaming";

function extFromUrl(u: string): string | null {
  const m = u.split("?")[0].match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

export type CreateSubmissionInput = {
  userId: string;
  courseId: string;
  assignmentId: string;
  comment: string;
};

class SubmissionModel {
  static async getCourseIdByAssignment(assignmentId: string) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { courseId: true },
    });
    return assignment?.courseId ?? null;
  }

  static async getGroupIdByUserAndCourse(userId: string, courseId: string) {
    const cm = await prisma.courseMember.findUnique({
      where: { courseId_userId: { courseId, userId } },
      select: { id: true },
    });
    if (!cm) return null;
    const gm = await prisma.groupMember.findFirst({
      where: { courseMemberId: cm.id },
      select: { groupId: true },
      orderBy: { groupId: "asc" },
    });
    return gm?.groupId ?? null;
  }

  static async hasSubmission(input: { groupId: string; assignmentId: string }) {
    const submission = await prisma.submission.findMany({
      where: {
        groupId: input.groupId,
        assignmentId: input.assignmentId,
      },
      orderBy: { submittedAt: "desc" },
      select: { id: true, status: true },
    });
    return submission;
  }

  static async createSubmission(input: CreateSubmissionInput) {
    const { userId, courseId, assignmentId, comment } = input;

    return prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.findUnique({
        where: { id: assignmentId },
        select: { id: true, courseId: true },
      });
      if (!assignment) {
        throw new Error("Assignment not found");
      }
      if (assignment.courseId !== courseId) {
        throw new Error("Assignment does not belong to the specified course");
      }

      const cm = await tx.courseMember.findUnique({
        where: { courseId_userId: { courseId, userId } },
        select: { id: true },
      });
      if (!cm) {
        throw new Error("You are not a member of this course");
      }

      const memberships = await tx.groupMember.findMany({
        where: { courseMemberId: cm.id },
        select: { groupId: true },
        orderBy: { groupId: "asc" },
      });
      if (memberships.length === 0) {
        throw new Error("You are not in any group for this course");
      }
      if (memberships.length > 1) {
        throw new Error(
          "You belong to multiple groups in this course; please specify a group explicitly"
        );
      }
      const groupId = memberships[0].groupId;

      const due = await tx.assignmentDueDate.findUnique({
        where: { assignmentId_groupId: { assignmentId, groupId } },
        select: { dueDate: true },
      });
      if (!due) {
        throw new Error("No due date found for this assignment and group.");
      }

      const now = new Date();

      const last = await tx.submission.findFirst({
        where: { assignmentId, groupId },
        orderBy: { version: "desc" },
        select: { version: true, status: true },
      });
      if (last?.status === "FINAL") {
        throw new Error(
          "This submission is already FINAL. No further submissions allowed."
        );
      }
      const nextVersion = (last?.version ?? 0) + 1;
      const nextStatus =
        last?.status === "APPROVED_WITH_FEEDBACK" ? "FINAL" : "SUBMITTED";

      const missed = now > due.dueDate;

      const created = await tx.submission.create({
        data: {
          assignmentId,
          groupId,
          status: nextStatus,
          missed,
          version: nextVersion,
          submittedAt: now,
          comment: comment?.trim() || null,
        },
      });

      return created;
    });
  }
  static async createSubmissionFile(data: {
    submissionId: string;
    deliverableId: string;
    fileUrl: string;
  }) {
    return prisma.submissionFile.create({
      data: {
        submissionId: data.submissionId,
        deliverableId: data.deliverableId,
        fileUrl: [data.fileUrl],
      },
    });
  }
}

export default SubmissionModel;
