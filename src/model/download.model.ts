import { prisma } from "../prisma";

export class DownloadModel {
  static async getFileDownloadUrl(fileId: string): Promise<string | null> {
    const row = await prisma.file.findUnique({
      where: { id: fileId },
      select: { filepath: true },
    });
    return row?.filepath ?? null;
  }

  static async getSubmissionFileDownloadUrl(
    submissionFileId: string
  ): Promise<string | null> {
    const row = await prisma.submissionFile.findUnique({
      where: { id: submissionFileId },
      select: { fileUrl: true }, 
    });
    return row?.fileUrl?.[0] ?? null; 
  }

  static async getFeedbackFileDownloadUrl(
    feedbackFileId: string
  ): Promise<string | null> {
    const row = await prisma.feedbackFile.findUnique({
      where: { id: feedbackFileId },
      select: { fileUrl: true }, 
    });
    return row?.fileUrl?.[0] ?? null; 
  }
}
