import { prisma } from "../prisma";

export type CreateFileInput = {
  name: string;
  filepath: string;
  uploadById: number;
};
export type GetAllFilesParams = {
  announcementId?: number | null;
  unattached?: boolean;
  uploadedById?: number;
  order?: "asc" | "desc";
};

class FileModel {
  static async createFile(data: CreateFileInput) {
    // validate uploader exists
    const user = await prisma.user.findUnique({
      where: { id: data.uploadById },
      select: { id: true },
    });
    if (!user) {
      const err: any = new Error("Uploader (uploadById) not found");
      err.status = 404;
      throw err;
    }

    return prisma.file.create({
      data: {
        name: data.name,
        filepath: data.filepath,
        uploadById: data.uploadById,
        announcementId: null,
      },
    });
  }

  static async getAllFiles(params: GetAllFilesParams = {}) {
    const { announcementId, unattached, uploadedById, order = "asc" } = params;

    const where: any = {};
    if (typeof uploadedById === "number" && !Number.isNaN(uploadedById)) {
      where.uploadById = uploadedById;
    }

    if (typeof announcementId === "number" && !Number.isNaN(announcementId)) {
      where.announcementId = announcementId;
    } else if (unattached) {
      where.announcementId = null;
    }

    return prisma.file.findMany({
      where,
      include: {
        uploadBy: true,
        announcement: true,
      },
      orderBy: { id: order },
    });
  }
}

export default FileModel;
