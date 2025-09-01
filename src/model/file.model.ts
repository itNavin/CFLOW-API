import { prisma } from "../prisma";

export type CreateFileInput = {
  name: string;
  filepath: string;
  uploadById: number;
  courseId?: number; // optional if announcementId is provided
  announcementId?: number | null; // optional
};

export type GetAllFilesParams = {
  courseId?: number;
  announcementId?: number | null;
  unattached?: boolean; // announcementId IS NULL
  uploadedById?: number;
  order?: "asc" | "desc";
};

class FileModel {
  static async createFile(data: CreateFileInput) {
    // Validate uploader
    const uploader = await prisma.user.findUnique({
      where: { id: data.uploadById },
      select: { id: true },
    });
    if (!uploader) {
      const err: any = new Error("Uploader (uploadById) not found");
      err.status = 404;
      throw err;
    }

    let courseId: number | undefined = data.courseId;
    let announcementId: number | null | undefined = data.announcementId ?? null;

    // If announcementId is provided, derive/validate courseId from it
    if (announcementId != null) {
      const ann = await prisma.announcement.findUnique({
        where: { id: announcementId },
        select: { id: true, courseId: true },
      });
      if (!ann) {
        const err: any = new Error("Announcement not found");
        err.status = 404;
        throw err;
      }
      if (courseId != null && courseId !== ann.courseId) {
        const err: any = new Error(
          "courseId does not match announcement's course"
        );
        err.status = 400;
        throw err;
      }
      courseId = ann.courseId; // force to announcement course
    }

    // If still no courseId, require it
    if (courseId == null) {
      const err: any = new Error(
        "courseId is required (or provide announcementId)"
      );
      err.status = 400;
      throw err;
    }

    // Validate course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      const err: any = new Error("Course not found");
      err.status = 404;
      throw err;
    }

    // Create file row
    return prisma.file.create({
      data: {
        name: data.name,
        filepath: data.filepath,
        uploadById: data.uploadById,
        courseId,
        announcementId: announcementId ?? null,
      },
      include: {
        uploadBy: true,
        course: true,
      },
    });
  }

  static async getAllFiles(params: GetAllFilesParams = {}) {
    const {
      courseId,
      announcementId,
      unattached,
      uploadedById,
      order = "asc",
    } = params;

    const where: any = {};

    if (typeof uploadedById === "number" && !Number.isNaN(uploadedById)) {
      where.uploadById = uploadedById;
    }

    if (typeof courseId === "number" && !Number.isNaN(courseId)) {
      where.courseId = courseId;
    }

    if (typeof announcementId === "number" && !Number.isNaN(announcementId)) {
      where.announcementId = announcementId;
    } else if (unattached === true) {
      where.announcementId = null;
    }

    return prisma.file.findMany({
      where,
      include: {
        uploadBy: true,
        course: true,
        announcement: true,
      },
      orderBy: { id: order },
    });
  }

  static async getFilesByCourseId(
    courseId: number,
    params: Omit<GetAllFilesParams, "courseId"> = {}
  ) {
    return this.getAllFiles({ ...params, courseId });
  }
}

export default FileModel;
