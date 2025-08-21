import { prisma } from "../prisma";

export type CreateFileInput = {
  name: string;
  filepath: string;
  uploadById: number;
};
export type GetAllFilesParams = {
  announcementId?: number | null; // if provided (number), filter by that announcement
  unattached?: boolean; // if true, announcementId must be null
  uploadedById?: number; // filter by uploader
  order?: "asc" | "desc"; // default "asc"
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

    // create file with announcementId = null
    return prisma.file.create({
      data: {
        name: data.name,
        filepath: data.filepath,
        uploadById: data.uploadById,
        announcementId: null, // 👈 explicitly not linked to any announcement
      },
    });
  }

  static async getAllFiles(params: GetAllFilesParams = {}) {
    const { announcementId, unattached, uploadedById, order = "asc" } = params;

    // Build WHERE
    const where: any = {};
    if (typeof uploadedById === "number" && !Number.isNaN(uploadedById)) {
      where.uploadById = uploadedById;
    }

    // If explicit announcementId is provided, use it (overrides unattached flag)
    if (typeof announcementId === "number" && !Number.isNaN(announcementId)) {
      where.announcementId = announcementId;
    } else if (unattached) {
      where.announcementId = null;
    }

    return prisma.file.findMany({
      where,
      include: {
        uploadBy: true, // who uploaded
        announcement: true, // linked announcement (may be null)
      },
      orderBy: { id: order },
    });
  }
}

export default FileModel;
