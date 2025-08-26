// src/model/submission.model.ts
import { prisma } from "../prisma";

function extFromUrl(u: string): string | null {
  const m = u.split("?")[0].match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

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
      // 0) Due date (compute missed etc.) — keep whatever you already have
      const due = await tx.assignmentDueDate.findUnique({
        where: { assignmentId_groupId: { assignmentId, groupId } },
        select: { dueDate: true },
      });
      if (!due)
        throw new Error("No due date found for this assignment and group.");
      const now = new Date();

      // 1) Load latest submission to decide version/status (keep your existing logic)
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

      // 2) Fetch deliverables + allowed types for this assignment
      const deliverables = await tx.deliverable.findMany({
        where: { assignmentId },
        include: { allowedFileTypes: true }, // uses .type like "pdf" / "docx"
      });

      // 3) Build a map of submitted extensions per deliverable
      const submittedByDeliverable = new Map<number, Set<string>>();
      for (const f of files ?? []) {
        if (!submittedByDeliverable.has(f.deliverableId)) {
          submittedByDeliverable.set(f.deliverableId, new Set());
        }
        const bucket = submittedByDeliverable.get(f.deliverableId)!;
        for (const url of f.fileUrls ?? []) {
          const ext = extFromUrl(url);
          if (ext) bucket.add(ext);
        }
      }

      // 4) Validate: each deliverable must include all required types
      for (const d of deliverables) {
        const required = d.allowedFileTypes.map((t) => t.type.toLowerCase()); // ["pdf","docx"]
        if (required.length === 0) continue; // nothing required

        const submitted = submittedByDeliverable.get(d.id) ?? new Set<string>();
        const missing = required.filter((req) => !submitted.has(req));

        if (missing.length > 0) {
          throw new Error(
            `Deliverable "${d.name}" (id: ${
              d.id
            }) is missing required file types: ${missing.join(", ")}. ` +
              `Submitted: [${Array.from(submitted).join(
                ", "
              )}], Required: [${required.join(", ")}]`
          );
        }

      }

      // 5) Compute missed from current due date
      const missed = now > due.dueDate;

      // 6) Create submission
      const created = await tx.submission.create({
        data: {
          assignmentId,
          groupId,
          status: nextStatus,
          missed,
          version: nextVersion,
          submittedAt: now,
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
