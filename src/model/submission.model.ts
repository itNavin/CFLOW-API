import { prisma } from "../prisma";

export type CreateSubmissionInput = {
  assignmentId: number;
  groupId: number;
  comment: string;
  files: Array<{ deliverableId: number; fileUrls: string[] }>;
};

class SubmissionModel {
  static async createSubmission(input: CreateSubmissionInput) {
    const { assignmentId, groupId, comment, files } = input;

    return prisma.$transaction(async (tx) => {
      // 0) Find due date for this assignment/group (must exist)
      const due = await tx.assignmentDueDate.findUnique({
        where: { assignmentId_groupId: { assignmentId, groupId } },
        select: { dueDate: true },
      });
      if (!due) {
        throw new Error(
          "No due date found for this assignment and group. Ask advisor to set one."
        );
      }

      const now = new Date();

      // 1) Load latest submission to determine next version + status rules
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

      // 2) Compute missed from current due date
      const missed = now > due.dueDate;

      // 3) Status rule
      // - If previous was APPROVED_WITH_FEEDBACK and student submits again => FINAL
      // - Else => SUBMITTED
      const nextStatus =
        last?.status === "APPROVED_WITH_FEEDBACK" ? "FINAL" : "SUBMITTED";

      // 4) Create submission (+ files)
      const created = await tx.submission.create({
        data: {
          assignmentId,
          groupId,
          status: nextStatus,
          missed, // 👈 computed here
          version: nextVersion,
          submittedAt: now,
          comment,
          submissionFiles: files?.length
            ? {
                create: files.map((f) => ({
                  deliverableId: f.deliverableId,
                  fileUrl: f.fileUrls, // String[]
                })),
              }
            : undefined,
        },
        include: {
          submissionFiles: {
            include: { deliverable: true },
            orderBy: { id: "asc" },
          },
        },
      });

      return created;
    });
  }
}

export default SubmissionModel;
