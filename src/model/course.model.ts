// course.model.ts
import { prisma } from "..";

class CourseModel {
  static async createCourse(
    name: string,
    description: string,
    program: "CS" | "DSI", // Match the enum
    createdById: number
  ) {
    const newCourse = await prisma.course.create({
      data: {
        name,
        description,
        program, // Must be 'CS' or 'DSI'
        createdById,
      },
    });

    return newCourse;
  }

  static async getAllCourses() {
    const courses = await prisma.course.findMany();
    return courses;
  }
}

export default CourseModel;
