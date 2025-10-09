import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

export type CreateFeedbackInput = {
  submissionId: string;
  comment?: string | null;
  newStatus: "REJECTED" | "APPROVED_WITH_FEEDBACK" | "FINAL";
  newDueDate?: Date | null; 
};


class FeedbackModel {
  static async createFeedback(input: CreateFeedbackInput) {
    const { submissionId, comment, newDueDate, newStatus } = input;

    return prisma
      .$transaction(async (tx) => {
        const submission = await tx.submission.findUnique({
          where: { id: submissionId },
          select: {
            id: true,
            assignmentId: true,
            groupId: true,
            assignment: {
              select: {
                id: true,
                endDate: true,
                deliverables: { select: { id: true } },
              },
            },
          },
        });
        if (!submission) throw new Error("Submission not found");

        const feedback = await tx.feedback.create({
          data: {
            submissionId: submission.id,
            comment,
          },
        });

        await tx.submission.update({
          where: { id: submission.id },
          data: { status: newStatus },
        });

        if (newStatus !== "FINAL" && newDueDate != null) {
          if (!(newDueDate instanceof Date) || isNaN(newDueDate.getTime())) {
            throw new Error("newDueDate must be a valid Date");
          }

          const now = new Date();
          if (newDueDate < now) {
            throw new Error(
              `newDueDate must not be in the past. Received: ${newDueDate.toISOString()}, now: ${now.toISOString()}`
            );
          }
          if (newDueDate > submission.assignment.endDate) {
            throw new Error(
              `newDueDate must be on or before the assignment endDate (${submission.assignment.endDate.toISOString()})`
            );
          }

          await tx.assignmentDueDate.upsert({
            where: {
              assignmentId_groupId: {
                assignmentId: submission.assignmentId,
                groupId: submission.groupId,
              },
            },
            update: { dueDate: newDueDate },
            create: {
              assignmentId: submission.assignmentId,
              groupId: submission.groupId,
              dueDate: newDueDate,
            },
          });
        }

        const updatedDue = await tx.assignmentDueDate.findUnique({
          where: {
            assignmentId_groupId: {
              assignmentId: submission.assignmentId,
              groupId: submission.groupId,
            },
          },
          select: { dueDate: true },
        });

        return {
          feedback,
          submission: { id: submission.id, status: newStatus },
          assignmentDueDate: updatedDue, 
        };
      })
      .catch((err) => {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2003"
        ) {
          throw new Error("Invalid deliverableId in feedbackFiles");
        }
        throw err;
      });
  }

  static async createFeedbackFile(data: {
    feedbackId: string;
    deliverableId: string;
    fileUrl: string;
    name: string;
  }) {
    return prisma.feedbackFile.create({
      data: {
        feedbackId: data.feedbackId,
        deliverableId: data.deliverableId,
        fileUrl: data.fileUrl,
        name: data.name,
      },
    });
  }
}

export default FeedbackModel;
