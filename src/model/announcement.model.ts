// src/model/announcement.model.ts
import { prisma } from "../prisma";

type NewFileInput = {
  name: string;
  filepath: string;
  uploadById?: number; // optional; defaults to createById
};

class AnnouncementModel {
  static async createAnnouncement(data: {
    courseId: number;
    name: string;
    description: string;
    schedule?: Date | null; // allow null if your schema is DateTime?
    createById: number;
    files?: NewFileInput[];
  }) {
    return prisma.$transaction(async (tx) => {
      // 1) sanity checks
      const course = await tx.course.findUnique({
        where: { id: data.courseId },
        select: { id: true },
      });
      if (!course) {
        const err: any = new Error("Course not found");
        err.status = 404;
        throw err;
      }

      // 2) create announcement
      const ann = await tx.announcement.create({
        data: {
          courseId: data.courseId,
          name: data.name,
          description: data.description,
          schedule: data.schedule ?? null, // pass null if optional
          createById: data.createById,
        },
        select: { id: true, courseId: true },
      });

      // 3) attach files (if any) using createMany (FK columns allowed here)
      if (data.files?.length) {
        await tx.file.createMany({
          data: data.files.map((f) => ({
            name: f.name,
            filepath: f.filepath,
            uploadById: f.uploadById ?? data.createById, // default to creator
            courseId: ann.courseId, // REQUIRED
            announcementId: ann.id, // link to announcement
          })),
        });
      }

      // 4) return hydrated record
      return tx.announcement.findUnique({
        where: { id: ann.id },
        include: {
          files: true,
          createdBy: true,
          course: true,
        },
      });
    });
  }

  static async getAllAnnouncement(courseId: number, publishedOnly = true) {
    return prisma.announcement.findMany({
      where: {
        courseId,
        ...(publishedOnly ? { schedule: { lte: new Date() } } : {}),
      },
      include: {
        files: true,
        createdBy: true,
      },
      orderBy: { id: "asc" },
    });
  }
}

export default AnnouncementModel;
