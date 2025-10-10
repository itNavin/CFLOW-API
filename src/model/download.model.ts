import { prisma } from "../prisma";

export class DownloadModel {
  static async getFileDownloadUrl(fileId: string){
    const row = await prisma.file.findUnique({
      where: { id: fileId },
      select: { filepath: true },
    });
    return row?.filepath;
  }

  static async getSubmissionFileDownloadUrl(submissionFileId: string) {
    const row = await prisma.submissionFile.findUnique({
      where: { id: submissionFileId },
      select: { fileUrl: true },
    });
    console.log("row", row);
    return row?.fileUrl;
  }

  static async getFeedbackFileDownloadUrl(
    feedbackFileId: string
  ){
    const row = await prisma.feedbackFile.findUnique({
      where: { id: feedbackFileId },
      select: { fileUrl: true },
    });
    return row?.fileUrl;
  }
}
