import { prisma } from "../prisma";
import { MIME_TO_EXT } from "../util/filenaming";

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
      // 0) Due date check
      const due = await tx.assignmentDueDate.findUnique({
        where: { assignmentId_groupId: { assignmentId, groupId } },
        select: { dueDate: true },
      });
      if (!due)
        throw new Error("No due date found for this assignment and group.");
      const now = new Date();

      // 1) latest submission for version/status
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

      // 2) Fetch deliverables + allowed MIME types
      const deliverables = await tx.deliverable.findMany({
        where: { assignmentId },
        include: {
          allowedFileTypes: { select: { mime: true, type: true } }, // mime + label
        },
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

      // 4) Validate: each deliverable must include all required types (by extension)
      for (const d of deliverables) {
        const requiredExts = d.allowedFileTypes
          .map((t) => {
            if (!t.mime) return null;
            const key = t.mime.toLowerCase();
            return MIME_TO_EXT[key] || null;
          })
          .filter((x): x is string => !!x);

        // if some MIME has no mapping, you can choose to reject:
        const unmapped = d.allowedFileTypes.filter(
          (t) => !t.mime || !MIME_TO_EXT[t.mime.toLowerCase?.() ?? ""]
        );
        if (unmapped.length > 0) {
          throw new Error(
            `Deliverable "${d.name}" (id: ${
              d.id
            }) has unsupported or missing MIME(s): ${unmapped
              .map((t) => t.mime ?? "null")
              .join(", ")}`
          );
        }

        if (requiredExts.length === 0) continue;

        const submitted = submittedByDeliverable.get(d.id) ?? new Set<string>();
        const missing = requiredExts.filter((req) => !submitted.has(req));

        if (missing.length > 0) {
          throw new Error(
            `Deliverable "${d.name}" (id: ${
              d.id
            }) is missing required file types: ${missing.join(
              ", "
            )}. Submitted: [${Array.from(submitted).join(
              ", "
            )}], Required (by ext): [${requiredExts.join(", ")}]`
          );
        }
      }

      // 5) missed flag
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
