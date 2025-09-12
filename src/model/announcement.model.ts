import { prisma } from "../prisma";

class AnnouncementModel {
  static async createAnnouncement(data: {
    courseId: string;
    name: string;
    description: string;
    schedule: Date;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id: data.courseId },
        select: { id: true },
      });
      if (!course) {
        const err: any = new Error("Course not found");
        err.status = 404;
        throw err;
      }

      const ann = await tx.announcement.create({
        data: {
          courseId: data.courseId,
          name: data.name,
          description: data.description,
          schedule: data.schedule, 
          createById: data.userId,
        },
        select: { id: true, courseId: true },
      });

      return tx.announcement.findUnique({
        where: { id: ann.id },
        include: { createdBy: true },
      });
    });
  }

  static async getAllAnnouncement(courseId: string, publishedOnly = true) {
    return prisma.announcement.findMany({
      where: {
        courseId,
        ...(publishedOnly ? { schedule: { lte: new Date() } } : {}),
      },
      include: {
        files: true,
        createdBy: true,
        course: true,
      },
      orderBy: { id: "asc" },
    });
  }
}

export default AnnouncementModel;
