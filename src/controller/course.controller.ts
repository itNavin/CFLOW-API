import { Context } from "hono";
import CourseModel from "../model/course.model";
import { CoursePayload } from "../types/payload/course.type";
import { AuthPayload } from "../types/payload/auth.type"
import * as jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is missing");
  return secret;
}

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
      // 1) Get Authorization header
      const authHeader = c.req.header("Authorization");
      console.log("Auth Header:", authHeader);
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return c.json(
          { message: "Unauthorized: missing or invalid token" },
          401
        );
      }
      const token = authHeader.split(" ")[1];
      console.log("Token:", token);
      // 2) Verify + decode token
      let payload: AuthPayload.Auth;
      try {
        payload = jwt.verify(token, getJwtSecret(), {
          algorithms: ["HS256"],
        }) as AuthPayload.Auth;
      } catch (err) {
        return c.json(
          { message: "Unauthorized: invalid or expired token" },
          401
        );
      }

      // 3) Extract userId
      const userId = payload.userId;
      console.log("Decoded Payload:", payload);
      console.log("User ID:", userId);
      if (!userId) {
        return c.json({ message: "Invalid token: missing userId" }, 400);
      }

      // 4) Fetch from model
      const overview = await CourseModel.getUserCourseOverview(userId);
      if (!overview) {
        return c.json({ message: "User not found" }, 404);
      }

      return c.json(overview, 200);
    } catch (error) {
      console.error("Error fetching user course overview:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  },
};
