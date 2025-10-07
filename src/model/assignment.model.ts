import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";

type AssignmentsByGroupLite = {
  courseId: string;
  groupId: string;
  counts: { open: number; submitted: number };
  openTasks: Array<{
    id: string;
    name: string;
    description: string | null;
    endDate: Date;
    schedule: Date | null;
    dueDate: Date | null;
  }>;
  submitted: Array<{
    id: string;
    name: string;
    description: string | null;
    endDate: Date;
    schedule: Date | null;
    dueDate: Date | null;
  }>;
};


export type CreateAssignmentInput = {
  courseId: string;
  name: string;
  description: string;
  endDate: Date;
  schedule: Date;
  dueDate: Date;
  deliverables?: Array<{
    name: string;
    allowedFileTypes?: Array<string | { mime: string; type?: string }>;
  }>;
};

export type UpdateAssignmentInput = {
  assignmentId: string;
  name: string;
  description: string;
  endDate: Date;
  schedule: Date;
  dueDate: Date;
  deliverables?: Array<{
    name: string;
    allowedFileTypes?: Array<string | { mime: string; type?: string }>;
  }>;
};

type DeleteAssignmentResult = {
  assignmentId: string;
  counts: {
    feedback: number;
    submissions: number;
    allowedFileTypes: number;
    deliverables: number;
    assignmentDueDates: number;
  };
  deletedAssignment: {
    id: string;
    name: string;
  } | null;
};

const EXT_TO_MIME: Record<string, { mime: string; label: string }> = {
  pdf: { mime: "application/pdf", label: "PDF" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "Word Document",
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    label: "Excel Spreadsheet",
  },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    label: "PowerPoint",
  },
  png: { mime: "image/png", label: "PNG Image" },
  jpg: { mime: "image/jpeg", label: "JPEG Image" },
  jpeg: { mime: "image/jpeg", label: "JPEG Image" },
  gif: { mime: "image/gif", label: "GIF Image" },
  svg: { mime: "image/svg+xml", label: "SVG Image" },
  zip: { mime: "application/zip", label: "ZIP Archive" },
  txt: { mime: "text/plain", label: "Text File" },
};

function normalizeAllowedFileTypes(
  list?: Array<string | { mime: string; type?: string }>
): Array<{ mime: string; type: string }> {
  if (!Array.isArray(list) || list.length === 0) return [];

  const normalized: Array<{ mime: string; type: string }> = [];

  for (const item of list) {
    if (!item) continue;

    if (typeof item === "string") {
      const val = item.trim();
      if (!val) continue;

      if (val.includes("/")) {
        normalized.push({
          mime: val.toLowerCase(),
          type: val.split("/")[1].toUpperCase(),
        });
      } else {
        const key = val.toLowerCase();
        const mapped = EXT_TO_MIME[key];
        if (!mapped) {
          throw new Error(
            `Unknown file type/extension: "${item}". Send a known extension or a MIME string.`
          );
        }
        normalized.push({ mime: mapped.mime, type: mapped.label });
      }
    } else {
      const mime = String(item.mime ?? "")
        .trim()
        .toLowerCase();
      if (!mime || !mime.includes("/")) {
        throw new Error(`Invalid MIME: "${item?.mime}"`);
      }
      const type = item.type?.trim() || mime.split("/")[1].toUpperCase();
      normalized.push({ mime, type });
    }
  }

  const seen = new Set<string>();
  return normalized.filter((x) => {
    if (seen.has(x.mime)) return false;
    seen.add(x.mime);
    return true;
  });
}

class AssignmentModel {
  static async getGroupsByLecturerId(userId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) throw new Error("Course not found");

    return prisma.group.findMany({
      where: {
        courseId,
        advisors: {
          some: {
            courseMember: {
              user: {
                id: userId,
              },
            },
          },
        },
      },

      orderBy: { id: "asc" },
    });
  }

  static async createAssignment(data: CreateAssignmentInput) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const assignment = await tx.assignment.create({
        data: {
          courseId: data.courseId,
          name: data.name,
          description: data.description,
          dueDate: data.dueDate,
          endDate: data.endDate,
          schedule: data.schedule,
        },
      });

      if (data.deliverables?.length) {
        for (const d of data.deliverables) {
          const createdDeliverable = await tx.deliverable.create({
            data: {
              name: d.name,
              assignmentId: assignment.id,
            },
          });

          const normalized = normalizeAllowedFileTypes(d.allowedFileTypes);
          if (normalized.length) {
            await tx.allowedFileType.createMany({
              data: normalized.map((t) => ({
                deliverableId: createdDeliverable.id,
                mime: t.mime,
                type: t.type,
              })),
              skipDuplicates: true,
            });
          }
        }
      }

      const groups = await tx.group.findMany({
        where: { courseId: data.courseId },
        select: { id: true },
      });

      if (groups.length) {
        await tx.assignmentDueDate.createMany({
          data: groups.map((g) => ({
            assignmentId: assignment.id,
            groupId: g.id,
            dueDate: data.dueDate,
          })),
          skipDuplicates: true,
        });
      }

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

  // model
  static async updateAssignment(data: UpdateAssignmentInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.assignment.findUnique({
        where: { id: data.assignmentId },
        select: { id: true, dueDate: true },
      });
      if (!existing) return null;

      // --- proceed with your existing update logic (core fields + deliverables) ---
      await tx.assignment.update({
        where: { id: data.assignmentId },
        data: {
          name: data.name,
          description: data.description ?? "",
          endDate: data.endDate,
          schedule: data.schedule,
          dueDate: data.dueDate,
        },
      });

      // If you’re replacing deliverables (and their allowed file types):
      if (Array.isArray(data.deliverables)) {
        await tx.allowedFileType.deleteMany({
          where: { deliverable: { assignmentId: data.assignmentId } },
        });
        await tx.deliverable.deleteMany({
          where: { assignmentId: data.assignmentId },
        });

        for (let i = 0; i < data.deliverables.length; i++) {
          const d = data.deliverables[i];
          const created = await tx.deliverable.create({
            data: {
              assignmentId: data.assignmentId,
              name: (d.name ?? "").trim(),
              // order: i, // uncomment if you have this column
            },
          });

          const norm = normalizeAllowedFileTypes(d.allowedFileTypes);
          if (norm.length > 0) {
            await tx.allowedFileType.createMany({
              data: norm.map((r) => ({
                deliverableId: created.id,
                mime: r.mime,
                type: r.type,
              })),
            });
          }
        }
      }

      // Propagate dueDate change if needed
      if (
        existing.dueDate &&
        data.dueDate &&
        existing.dueDate.getTime() !== data.dueDate.getTime()
      ) {
        await tx.assignmentDueDate.updateMany({
          where: { assignmentId: data.assignmentId, dueDate: existing.dueDate },
          data: { dueDate: data.dueDate },
        });
      }

      return tx.assignment.findUnique({
        where: { id: data.assignmentId },
        include: {
          deliverables: { include: { allowedFileTypes: true } },
          assignmentDueDates: true,
        },
      });
    });
  }

  static async deleteAssignment(
    assignmentId: string
  ): Promise<DeleteAssignmentResult | null> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 0) Ensure the assignment exists first
      const existing = await tx.assignment.findUnique({
        where: { id: assignmentId },
        select: { id: true, name: true },
      });
      if (!existing) return null;

      // 1) Delete feedback -> via submissions of this assignment
      const feedbackRes = await tx.feedback.deleteMany({
        where: { submission: { assignmentId } },
      });

      // 2) Delete submissions
      const submissionRes = await tx.submission.deleteMany({
        where: { assignmentId },
      });

      // 3) Delete allowed file types -> via deliverables of this assignment
      const aftRes = await tx.allowedFileType.deleteMany({
        where: { deliverable: { assignmentId } },
      });

      // 4) Delete deliverables
      const deliverableRes = await tx.deliverable.deleteMany({
        where: { assignmentId },
      });

      // 5) Delete assignment-level due dates
      const dueDateRes = await tx.assignmentDueDate.deleteMany({
        where: { assignmentId },
      });

      // 6) Finally delete the assignment itself
      const deletedAssignment = await tx.assignment.delete({
        where: { id: assignmentId },
        select: { id: true, name: true },
      });

      return {
        assignmentId,
        counts: {
          feedback: feedbackRes.count,
          submissions: submissionRes.count,
          allowedFileTypes: aftRes.count,
          deliverables: deliverableRes.count,
          assignmentDueDates: dueDateRes.count,
        },
        deletedAssignment,
      };
    });
  }

  static async getAllAssignments(courseId: string) {
    const now = new Date();
    return prisma.assignment.findMany({
      where: { courseId, schedule: { lte: now } },
      orderBy: { id: "asc" },
    });
  }

  static async getAssignmentWithSubmissions(
    assignmentId: string,
    groupId: string
  ) {
    return prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        deliverables: {
          include: {
            allowedFileTypes: true,
          },
          orderBy: { id: "asc" },
        },
        assignmentDueDates: {
          where: { groupId },
          orderBy: { id: "asc" },
        },
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
  }

  static async getStudentAssignmentByGroupId(
    courseId: string,
    groupId: string
  ): Promise<AssignmentsByGroupLite> {
    const now = new Date();

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId,
        schedule: { lte: now },
      },
      select: {
        id: true,
        name: true,
        description: true,
        endDate: true,
        schedule: true,
        assignmentDueDates: {
          where: { groupId },
          select: { dueDate: true },
          take: 1,
        },
        submissions: {
          where: { groupId },
          select: { id: true, status: true, submittedAt: true }, // add status + submittedAt
          take: 1,
          orderBy: { submittedAt: "desc" }, // order by time, not id
        },
      },
      orderBy: { id: "asc" },
    });

    const openTasks: AssignmentsByGroupLite["openTasks"] = [];
    const submitted: AssignmentsByGroupLite["submitted"] = [];

    for (const a of assignments) {
      const dueDate = a.assignmentDueDates[0]?.dueDate ?? null;
      const base = {
        id: a.id,
        name: a.name,
        description: a.description ?? null,
        endDate: a.endDate,
        schedule: a.schedule ?? null,
        dueDate,
      };

      const latest = a.submissions[0]; // newest because of orderBy desc

      if (!latest) {
        // never submitted
        openTasks.push(base);
      } else if (
        latest.status === "REJECTED" ||
        latest.status === "APPROVED_WITH_FEEDBACK"
      ) {
        // needs resubmission -> treat as open
        openTasks.push(base);
      } else {
        // SUBMITTED or FINAL -> treat as submitted
        submitted.push(base);
      }
    }

    return {
      courseId,
      groupId,
      counts: { open: openTasks.length, submitted: submitted.length },
      openTasks,
      submitted,
    };
  }
}

export default AssignmentModel;
