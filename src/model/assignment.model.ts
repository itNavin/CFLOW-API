import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";

export type CreateAssignmentInput = {
  courseId: number;
  name: string;
  description: string;
  endDate: Date;
  schedule: Date;
  dueDate: Date; // 👈 NEW: single due date to apply to all groups in the course
  deliverables?: Array<{
    name: string;
    allowedFileTypes?: string[];
  }>;
};

class AssignmentModel {
  static async createAssignment(data: CreateAssignmentInput) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Create assignment
      const assignment = await tx.assignment.create({
        data: {
          courseId: data.courseId,
          name: data.name,
          description: data.description,
          endDate: data.endDate,
          schedule: data.schedule,
          ...(data.deliverables?.length
            ? {
                deliverables: {
                  create: data.deliverables.map((d) => ({
                    name: d.name,
                    ...(d.allowedFileTypes?.length
                      ? {
                          allowedFileTypes: {
                            create: d.allowedFileTypes.map((t) => ({
                              type: t,
                            })),
                          },
                        }
                      : {}),
                  })),
                },
              }
            : {}),
        },
      });

      // 2) Get all groups in this course
      const groups = await tx.group.findMany({
        where: { courseId: data.courseId },
        select: { id: true },
      });

      // 3) Insert one AssignmentDueDate per group (if any groups exist)
      if (groups.length) {
        await tx.assignmentDueDate.createMany({
          data: groups.map((g) => ({
            assignmentId: assignment.id,
            groupId: g.id,
            dueDate: data.dueDate,
          })),
          skipDuplicates: true, // safety
        });
      }

      // 4) Return assignment with full includes (including the generated due dates)
      const full = await tx.assignment.findUnique({
        where: { id: assignment.id },
        include: {
          deliverables: { include: { allowedFileTypes: true } },
          assignmentDueDates: true,
        },
      });

      return full!;
    });
  }

  static async getAllAssignments(courseId: number) {
    const now = new Date();
    return prisma.assignment.findMany({
      where: {
        courseId,
        schedule: { lte: now }, 
      },
      include: {
        deliverables: { include: { allowedFileTypes: true } },
        assignmentDueDates: true,
      },
      orderBy: { id: "asc" },
    });
  }

  static async getAssignmentWithSubmissions(
    assignmentId: number,
    groupId: number
  ) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        deliverables: { include: { allowedFileTypes: true } },
        assignmentDueDates: { where: { groupId } },
        submissions: {
          where: { groupId },
          include: {
            submissionFiles: {
              include: { deliverable: true },
              orderBy: { id: "asc" },
            },
            feedbacks: {
              include: {
                feedbackFiles: {
                  include: { deliverable: true },
                  orderBy: { id: "asc" },
                },
              },
              orderBy: { id: "asc" },
            },
          },
          orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        },
      },
    });

    return assignment;
  }
}

export default AssignmentModel;
