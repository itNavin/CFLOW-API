import { prisma } from "../prisma";
import type { Prisma } from "@prisma/client";

export type AssignmentsByGroupLite = {
  courseId: number;
  groupId: number;
  counts: { open: number; submitted: number };
  openTasks: Array<{
    id: number;
    name: string;
    description: string | null;
    endDate: Date; // will serialize to ISO in JSON
    schedule: Date | null;
    dueDate: Date | null; // per-group due date
  }>;
  submitted: Array<{
    id: number;
    name: string;
    description: string | null;
    endDate: Date;
    schedule: Date | null;
    dueDate: Date | null;
  }>;
};


export type CreateAssignmentInput = {
  courseId: number;
  name: string;
  description: string;
  endDate: Date;
  schedule: Date;
  dueDate: Date;
  deliverables?: Array<{
    name: string;
    // can be ["pdf", "docx"] OR [{ mime, type }]
    allowedFileTypes?: Array<string | { mime: string; type?: string }>;
  }>;
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
  static async getGroupsByLecturerId(userId: string, courseId: number) {
    return prisma.group.findMany({
      where: {
        courseId,
        // at least one advisor whose courseMember.user.id === uid
        advisors: {
          some: {
            courseMember: {
              user: {
                id: userId,
              },
              // OR slightly faster (uses the FK on CourseMember):
              // userId: uid
            },
          },
        },
      },

      orderBy: { id: "asc" },
    });
  }

  static async createAssignment(data: CreateAssignmentInput) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Create assignment (we’ll add deliverables afterward so we can normalize types)
      const assignment = await tx.assignment.create({
        data: {
          courseId: data.courseId,
          name: data.name,
          description: data.description,
          endDate: data.endDate,
          schedule: data.schedule,
        },
      });

      // 2) Create deliverables + allowedFileTypes
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

      // 3) Add due date to all groups in course
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

      // 4) Return full assignment with normalized file types included
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
      where: { courseId, schedule: { lte: now } },
      orderBy: { id: "asc" },
    });
  }

  static async getAssignmentWithSubmissions(
    assignmentId: number,
    groupId: number
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

  static async getAssignmentsForGroup(
    courseId: number,
    groupId: number
  ): Promise<AssignmentsByGroupLite> {
    const now = new Date();

    const assignments = await prisma.assignment.findMany({
      where: { courseId, schedule: { lte: now } }, // only released
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
        // Pull just one submission id to know if the group has submitted
        submissions: {
          where: { groupId },
          select: { id: true },
          take: 1,
          orderBy: { id: "desc" },
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

      if (a.submissions.length === 0) {
        openTasks.push(base);
      } else {
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
