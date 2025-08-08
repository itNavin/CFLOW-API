import { Context } from "hono";
import CourseModel from "../model/course.model";

export const CourseController = {
  createCourse: async (c: Context) => {
    try {
      const body = await c.req.json();
      const { name, description, program, createdById } = body;

      if (!name || !description || !program || !createdById) {
        return c.json({ message: "Missing required fields" }, 400);
      }

      const course = await CourseModel.createCourse(
        name,
        description,
        program,
        createdById
      );

      return c.json(course, 201);
    } catch (error) {
      console.error("Error creating course:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  },

  getAllCourses: async (c: Context) => {
    try {
      const courses = await CourseModel.getAllCourses();
      return c.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  },
};
