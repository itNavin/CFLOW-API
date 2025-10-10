// model/download.model.ts
import { prisma } from "../prisma";
import {
  extractObjectKeyFromAbsoluteUrl,
  guessMimeFromName,
} from "../util/storage";

export class DownloadModel {
  static async getFileKeyAndMeta(fileId: string) {
    // File table uses 'filepath' (absolute URL)
    const row = await prisma.file.findUnique({
      where: { id: fileId },
      select: { filepath: true, name: true }, // if you have 'name'; else drop it
    });
    if (!row?.filepath) return null;
    const objectKey = extractObjectKeyFromAbsoluteUrl(row.filepath);
    const filename = row.name ?? objectKey.split("/").pop() ?? "file";
    const mime = guessMimeFromName(filename);
    return { objectKey, filename, mime };
  }

  static async getSubmissionKeyAndMeta(submissionFileId: string) {
    const row = await prisma.submissionFile.findUnique({
      where: { id: submissionFileId },
      select: { fileUrl: true, name: true },
    });
    if (!row?.fileUrl) return null;
    const objectKey = extractObjectKeyFromAbsoluteUrl(row.fileUrl);
    const filename = row.name ?? objectKey.split("/").pop() ?? "file";
    const mime = guessMimeFromName(filename);
    return { objectKey, filename, mime };
  }

  static async getFeedbackKeyAndMeta(feedbackFileId: string) {
    const row = await prisma.feedbackFile.findUnique({
      where: { id: feedbackFileId },
      select: { fileUrl: true, name: true },
    });
    if (!row?.fileUrl) return null;
    const objectKey = extractObjectKeyFromAbsoluteUrl(row.fileUrl);
    const filename = row.name ?? objectKey.split("/").pop() ?? "file";
    const mime = guessMimeFromName(filename);
    return { objectKey, filename, mime };
  }
}
