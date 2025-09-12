import { prisma } from "../prisma";
import { buildObjectKey, changeFilename } from "../util/filenaming";

export type ChangeFileNameInput = {
  groupCode: string;
  deliverableName: string;
  version: number;
  mime?: string;
  originalName?: string;
  partIndex?: number;
  deliverableId?: string;
  courseId?: string;
  assignmentId?: string;
};

function extFromOriginalName(name?: string): string | undefined {
  if (!name) return;
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === name.length - 1) return;
  return name.slice(lastDot + 1).toLowerCase();
}

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

    if (!chosenMime && originalName) {
      const ext = extFromOriginalName(originalName);
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

    const filename = changeFilename({
      groupCode,
      deliverableName,
      version,
      mime: chosenMime ?? "",
      partIndex,
    });

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
      key,
      usedMime: chosenMime ?? null,
      partIndex: partIndex ?? null,
    };
  }
}

export default FilenameModel;
