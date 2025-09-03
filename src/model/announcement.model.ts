import { prisma } from "../prisma";

type NewFileInput = {
  name: string;
  filepath: string;
  createdById?: number;
};

class AnnouncementModel {
  static async createAnnouncement(data: {
    courseId: number;
    name: string;
    description: string;
    schedule?: Date | null; 
    userId: number;
    // files?: NewFileInput[];
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
          schedule: data.schedule ?? null, 
          createById: data.userId,
        },
        select: { id: true, courseId: true },
      });

      // if (data.files?.length) {
      //   await tx.file.createMany({
      //     data: data.files.map((f) => ({
      //       name: f.name,
      //       filepath: f.filepath,
      //       createdById: f.createdById ?? data.userId, 
      //       courseId: ann.courseId,                         
      //       announcementId: ann.id,                         
      //     })),
      //   });
      // }

      return tx.announcement.findUnique({
        where: { id: ann.id },
        include: {
          files: true,      
          createdBy: true,
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
        course: true,
      },
      orderBy: { id: "asc" },
    });
  }
}

export default AnnouncementModel;
