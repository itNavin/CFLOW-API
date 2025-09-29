import { prisma } from "../prisma";

export type CreateFileInput = {
  name: string;
  filepath: string;
  createdById: number; 
  courseId?: number; 
  announcementId?: number | null;
};

type GetAllFilesParams = {
  courseId?: string; 
  announcementId?: string; 
  unattached?: boolean;
  createdById?: string;
  order?: "asc" | "desc";
};

class FileModel {
  static async createFile(data: {
    name: string;
    filepath: string;
    createdById: string;
    courseId?: string;
    announcementId?: string | null;
  }) {
    const creator = await prisma.user.findUnique({
      where: { id: data.createdById },
      select: { id: true },
    });
    if (!creator) {
      const err: any = new Error("Creator (createdById) not found");
      err.status = 404;
      throw err;
    }

    let courseId = data.courseId;
    let announcementId = data.announcementId ?? null;

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
      courseId = ann.courseId;
    }

    if (courseId == null) {
      const err: any = new Error(
        "courseId is required (or provide announcementId)"
      );
      err.status = 400;
      throw err;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      const err: any = new Error("Course not found");
      err.status = 404;
      throw err;
    }

    return prisma.file.create({
      data: {
        name: data.name,
        filepath: data.filepath,
        createdById: data.createdById,
        courseId,
        announcementId: announcementId ?? null,
      },
      include: {
        createdBy: true,
        course: true,
      },
    });
  }

  static async getAllFiles(params: GetAllFilesParams = {}) {
    const {
      courseId,
      announcementId,
      unattached,
      createdById,
      order = "asc",
    } = params;

    const where: any = {};

    if (typeof createdById === "string" && createdById.trim() !== "") {
      where.createdById = createdById.trim(); 
    }

    if (typeof courseId === "string" && courseId.trim() !== "") {
      where.courseId = courseId.trim(); 
    }

    if (typeof announcementId === "number" && !Number.isNaN(announcementId)) {
      where.announcementId = announcementId;
    } else if (unattached === true) {
      where.announcementId = null;
    }

    return prisma.file.findMany({
      where,
      include: {
        createdBy: true,
        course: true,
      },
      orderBy: { uploadAt: order },
    });
  }

  static async getFilesByCourseId(
    courseId: string,
    params: Omit<GetAllFilesParams, "courseId"> = {}
  ) {
    return this.getAllFiles({ ...params, courseId });
  }
}

export default FileModel;
