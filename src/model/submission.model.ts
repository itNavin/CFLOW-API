// src/model/submission.model.ts
import { prisma } from "../prisma";

export type CreateSubmissionInput = {
  assignmentId: number;
  groupId: number;
  missed: boolean;
  comment: string;
  files: Array<{
    deliverableId: number;
    fileUrls: string[];
  }>;
};

class SubmissionModel {
  static async createSubmission(input: CreateSubmissionInput) {
    const { assignmentId, groupId, missed, comment, files } = input;

    return prisma.$transaction(async (tx) => {
      // 1) Get latest version
      const last = await tx.submission.findFirst({
        where: { assignmentId, groupId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (last?.version ?? 0) + 1;

      // 2) Create submission
      const created = await tx.submission.create({
        data: {
          assignmentId,
          groupId,
          status: "SUBMITTED",
          missed,
          version: nextVersion,
          submittedAt: missed ? null : new Date(),
          comment,
          submissionFiles: files?.length
            ? {
                create: files.map((f) => ({
                  deliverableId: f.deliverableId,
                  fileUrl: f.fileUrls,
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
