import type { Context } from "hono";
import CourseModel from "../model/course.model";
import type { CoursePayload } from "../types/payload/course.type";

export const CourseController = {
  // POST /course/createCourse  
  createCourse: async (c: Context) => {
    try {
      const role = c.get("role");
      const userId = c.get("userId");

      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      if (role !== "ADMIN") {
        return c.json({ message: "Forbidden: ADMIN only" }, 403);
      }

      const body = await c.req.json<CoursePayload.CreateCourse>();
      const { name, description, program } = body; 

      if (!name || !description || !program) {
        return c.json({ message: "Missing required fields" }, 400);
      }

      const course = await CourseModel.createCourse(
        name,
        description,
        program,
        userId 
      );

      return c.json(course, 201);
    } catch (error: any) {
      console.error("Error creating course:", error);
      const status = error?.status ?? 500;
      const message =
        status === 403
          ? "Forbidden: ADMIN only"
          : error?.message ?? "Internal server error";
      return c.json({ message }, status);
    }
  },

  // GET /course/getAllCourses
  getAllCourses: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "ADMIN") {
        return c.json({ message: "Forbidden: ADMIN only" }, 403);
      }

      const courses = await CourseModel.getAllCourses();
      return c.json(courses, 200);
    } catch (error) {
      console.error("Error fetching courses:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  },

  // GET /course/my-courses
  getCourseByUser: async (c: Context) => {
    try {
      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const overview = await CourseModel.getUserCourseOverview(userId);
      if (!overview) {
        return c.json({ message: "User not found" }, 404);
      }

      return c.json(overview, 200);
    } catch (error: any) {
      console.error("Error fetching user course overview:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  },
};
