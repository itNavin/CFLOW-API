// src/model/filename.model.ts
import { prisma } from "../prisma"; // remove if you don't want DB validation here
import { buildObjectKey, changeFilename } from "../util/filenaming";

export type ChangeFileNameInput = {
  groupCode: string; // e.g. "0001"
  deliverableName: string; // e.g. "Chapter 4"
  version: number; // e.g. 1
  mime?: string; // preferred: "application/pdf"
  originalName?: string; // fallback to extract extension (NOT used if mime provided)
  partIndex?: number; // 1..N for multiple files in same deliverable
  // Optional: for validation & full key building
  deliverableId?: number; // if provided, verify mime is allowed for this deliverable
  courseId?: number;
  assignmentId?: number;
};

function extFromOriginalName(name?: string): string | undefined {
  if (!name) return;
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === name.length - 1) return;
  return name.slice(lastDot + 1).toLowerCase();
}

/**
 * FilenameModel
 * - MIME-first filename generation (falls back to originalName’s extension).
 * - Optional: validates MIME against AllowedFileType for deliverableId.
 * - Optional: returns a full object key if courseId & assignmentId are provided.
 */
class FilenameModel {
  static async changeFileName(input: ChangeFileNameInput) {
    const {
      groupCode,
      deliverableName,
      version,
      mime,
      originalName,
      partIndex,
      deliverableId,
      courseId,
      assignmentId,
    } = input;

    let chosenMime = mime?.toLowerCase();

    // (Optional) If deliverableId provided and mime provided, verify it's allowed.
    if (deliverableId && chosenMime) {
      const allowed = await prisma.allowedFileType.findFirst({
        where: { deliverableId, mime: chosenMime },
        select: { id: true },
      });
      if (!allowed) {
        throw new Error(
          `MIME "${chosenMime}" is not allowed for deliverableId ${deliverableId}`
        );
      }
    }

    // If no mime supplied, try to infer from original file name.
    // NOTE: This is a fallback for convenience only. Prefer sending MIME.
    if (!chosenMime && originalName) {
      const ext = extFromOriginalName(originalName);
      // Lightweight inference map (minimal):
      const EXT_TO_MIME: Record<string, string> = {
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        zip: "application/zip",
        txt: "text/plain",
      };
      if (ext && EXT_TO_MIME[ext]) {
        chosenMime = EXT_TO_MIME[ext];
      }
    }

    // Build filename (throws if mime unsupported).
    const filename = changeFilename({
      groupCode,
      deliverableName,
      version,
      mime: chosenMime ?? "", // changeFilename will throw a clear error if empty/unsupported
      partIndex,
    });

    // Optionally build a full storage key when courseId & assignmentId are supplied.
    let key: string | null = null;
    if (typeof courseId === "number" && typeof assignmentId === "number") {
      key = buildObjectKey({
        courseId,
        assignmentId,
        groupCode,
        version,
        filename,
      });
    }

    return {
      filename,
      key, // null if not built
      usedMime: chosenMime ?? null,
      partIndex: partIndex ?? null,
    };
  }
}

export default FilenameModel;
