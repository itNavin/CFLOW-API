// src/model/feedback.model.ts
import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

export type CreateFeedbackInput = {
  submissionId: number;
  comment: string;
  files: Array<{ deliverableId: number; fileUrls: string[] }>;
  newDueDate: Date;
  newStatus: "REJECTED" | "APPROVED_WITH_FEEDBACK" | "FINAL";
};

class FeedbackModel {
  static async createFeedback(input: CreateFeedbackInput) {
    const { submissionId, comment, files, newDueDate, newStatus } = input;

    return prisma
      .$transaction(async (tx) => {
        // 1) Load submission + related info (include assignment.endDate for validation)
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

        const now = new Date();

        // 1.1) Validate newDueDate: now <= newDueDate <= assignment.endDate
        if (!(newDueDate instanceof Date) || isNaN(newDueDate.getTime())) {
          throw new Error("newDueDate must be a valid Date");
        }
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

        // 2) Validate deliverables belong to this assignment
        const validDeliverableIds = new Set(
          submission.assignment.deliverables.map((d) => d.id)
        );
        for (const f of files ?? []) {
          if (!validDeliverableIds.has(f.deliverableId)) {
            throw new Error(
              `deliverableId ${f.deliverableId} does not belong to assignment ${submission.assignmentId}`
            );
          }
        }

        // 3) Create feedback (+ files)
        const feedback = await tx.feedback.create({
          data: {
            submissionId: submission.id,
            comment,
            feedbackFiles: files?.length
              ? {
                  create: files.map((f) => ({
                    deliverableId: f.deliverableId,
                    fileUrl: f.fileUrls,
                  })),
                }
              : undefined,
          },
          include: {
            feedbackFiles: {
              include: { deliverable: true },
              orderBy: { id: "asc" },
            },
          },
        });

        // 4) Update AssignmentDueDate for this group (upsert in case missing)
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

        // 5) Update submission status
        await tx.submission.update({
          where: { id: submission.id },
          data: { status: newStatus },
        });

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
}

export default FeedbackModel;
