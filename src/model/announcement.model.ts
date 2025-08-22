import { prisma } from "../prisma";

type NewFileInput = {
  name: string;
  filepath: string;
  uploadById: number;
};

class AnnouncementModel {
  static async createAnnouncement(data: {
    courseId: number;
    name: string;
    description: string;
    schedule: Date;
    createById: number;
    files?: NewFileInput[];
  }) {

    const created = await prisma.announcement.create({
      data: {
        courseId: data.courseId,
        name: data.name,
        description: data.description,
        schedule: data.schedule,
        createById: data.createById,
        ...(data.files?.length
          ? {
              files: {
                create: data.files.map((f) => ({
                  name: f.name,
                  filepath: f.filepath,
                  uploadById: f.uploadById,
                })),
              },
            }
          : {}),
      },
      include: {
        files: true,
        createdBy: true,
        course: true,
      },
    });

    return created;
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
