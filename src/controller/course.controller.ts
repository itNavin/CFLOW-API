import { Context } from "hono";
import CourseModel from "../model/course.model";
import { CoursePayload } from "../types/payload/course.type";
import { decodeToken, getTokenFromHeader } from "../util/jwt";

export const CourseController = {
  createCourse: async (c: Context) => {
    try {
      const body = await c.req.json<CoursePayload.CreateCourse>();
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

  getCourseByUser: async (c: Context) => {
    try {
      // 1) Extract token from header
      const token = getTokenFromHeader(c.req.header("Authorization"));
      if (!token) {
        return c.json({ message: "Unauthorized: missing token" }, 401);
      }

      // 2) Decode
      const payload = decodeToken(token);
      const userId = payload.userId;

      // 3) Fetch overview
      const overview = await CourseModel.getUserCourseOverview(userId);
      if (!overview) {
        return c.json({ message: "User not found" }, 404);
      }

      return c.json(overview, 200);
    } catch (error: any) {
      console.error("Error fetching user course overview:", error);
      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      ) {
        return c.json(
          { message: "Unauthorized: invalid or expired token" },
          401
        );
      }
      return c.json({ message: "Internal server error" }, 500);
    }
  },
};
