import { prisma } from "../prisma";

class AnnouncementModel {
  static async createAnnouncement(data: {
    courseId: string;
    name: string;
    description: string | null;
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

  static async updateAnnouncement( 
    announcementId: string,
    name: string,
    description: string | undefined,
    schedule: Date
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.announcement.update({
        where: { id: announcementId },
        data: {
          name,
          description,
          schedule,
        },
      });
      return tx.announcement.findUnique({
        where: { id: announcementId },
        include: { createdBy: true },
      });
    });
  }

  static async deleteAnnouncement(announcementId: string) {
    return prisma.$transaction(async (tx) => {
      const ann = await tx.announcement.findUnique({
        where: { id: announcementId },
        include: { createdBy: true },
      });
      await tx.announcement.delete({
        where: { id: announcementId },
      });
      return ann;
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

  static async getCourseIdByAnnouncementId(announcementId: string) {
    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { courseId: true },
    });
    return ann;
    
  }
}

export default AnnouncementModel;
