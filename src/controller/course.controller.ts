import type { Context } from "hono";
import CourseModel from "../model/course.model";
import type { CoursePayload } from "../types/payload/course.type";
import { isValidUUID } from "../types/uuid";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";
import { courseMail } from "src/mail/course.mail";
import { prisma } from "src/prisma";

export const CourseController = {
  createCourse: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: staff only" }, 403);
      }

      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const body = await c.req.json<CoursePayload.createCourse>();
      const { name, description, program } = body;
      const duplicateName = await CourseModel.getCourseByName(name);
      if (duplicateName) {
        return c.json({ message: "Course name already exists" }, 400);
      }

      if (!name || !program) {
        return c.json({ message: "Missing required fields" }, 400);
      }
      if (name.length > 100) {
        return c.json({ message: "Course name too long" }, 400);
      }
      if (description.length > 500) {
        return c.json({ message: "Course description too long" }, 400);
      }

      const created = await CourseModel.createCourse(
        name,
        description,
        program,
        userId
      );
      //mail
      //const mailUsers = await mailRoles.getStaff();
      const mailUsers = await mailRoles.test2("stf02");

      await mailSentAndSummary(mailUsers, async (u) => {
        const recipientName = u?.user?.name || u?.name || "User";
        return courseMail.createCourseMail(name, created, recipientName);
      });

      return c.json(
        {
          message: "Course created successfully",
          course: created,
        },
        201
      );
    } catch (error: any) {
      console.error({
        context: "createCourse",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  updateCourseById: async (c: Context) => {
    try {
      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const body = await c.req.json<CoursePayload.updateCourseBody>();

      const courseId = body.courseId;
      if (!courseId) {
        return c.json({ message: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }

      const courseName = String(body.name);
      const duplicateName = await CourseModel.getCourseByName(courseName);
      if (duplicateName && duplicateName.id !== courseId) {
        return c.json({ message: "Course name already exists" }, 400);
      }
      if (!courseName) {
        return c.json({ message: "Invalid course name" }, 400);
      }
      if (courseName.length > 100) {
        return c.json({ message: "Course name too long" }, 400);
      }
      if (courseName === " ") {
        return c.json({ message: "Course name cannot be empty" }, 400);
      }

      const courseDescription = String(body.description);
      if (courseDescription.length > 500) {
        return c.json({ message: "Course description too long" }, 400);
      }

      const updated = await CourseModel.updateCourseById(body);

      //mail
      //const mailUsers = await mailRoles.getAllUsersInCourse(courseId);
      const mailUsers = await mailRoles.test2("stf02");

      await mailSentAndSummary(mailUsers, async (u) => {
        const recipientName = u?.user?.name || u?.name || "User";
        return courseMail.updateCourseMail(
          courseName,
          updated,
          userId,
          recipientName
        );
      });

      return c.json(
        {
          message: "The course has been updated successfully",
          course: updated,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "updateCourseById",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  getStaffCourses: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: staff only" }, 403);
      }

      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const courses = await CourseModel.getStaffCourses(userId);

      return c.json(
        {
          message: "get staff courses successfully",
          course: courses,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "updateCourseById",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  getCourseByUser: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "student" && role !== "lecturer") {
        return c.json({ message: "Forbidden: student, lecturer only" }, 403);
      }

      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const course = await CourseModel.getCourseByUser(userId);

      return c.json(
        {
          message: "get user course successfully",
          course: course,
        },
        200
      );
    } catch (error: any) {
      console.error({
        context: "updateCourseById",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  getCoursenameById: async (c: Context) => {
    try {
      const courseId = c.req.param("courseId");
      if (!courseId) {
        return c.json({ message: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }

      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        return c.json({ message: "Course not found" }, 404);
      }

      return c.json(
        {
          message: "Get course name by ID successfully",
          coursename: course.name,
        },
        200
      );
    } catch (error: any) {
      console.error({
        context: "getCoursenameById",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
  deleteCourseById: async (c: Context) => {
    try {
      const userId = c.get("userId"); 
      const actor = userId
        ? await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
          })
        : null;
      const role = c.get("role");
      if (role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json({ message: "Forbidden: STAFF or SUPER_ADMIN only" }, 403);
      }
      const body = await c.req.json<{ courseId: string }>();

      const courseId = body.courseId;
      if (!courseId) return c.json({ message: "courseId is required" }, 400);
      if (!isValidUUID(courseId)) {
        return c.json({ message: "courseId must be a valid UUID" }, 400);
      }

      const result = await CourseModel.deleteCourse(courseId);

      const courseName = await CourseModel.getCourseById(courseId);

      //mail
      const mailUsers = await mailRoles.getStaff();

      await mailSentAndSummary(mailUsers, async (u) => {
        const recipientName = u?.user?.name || u?.name || "User";
        return courseMail.deleteCourseMail(
          courseName,
          recipientName,
          { deletedAt: new Date(), deletedBy: actor } 
        );
      });

      return c.json(
        {
          message: "Course and related data deleted successfully",
          summary: result.counts,
        },
        200
      );
    } catch (error: any) {
      console.error({
        context: "deleteCourseById",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
};
