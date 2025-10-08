import { Context } from "hono";
import { prisma } from "../prisma";

import {
  getAdvisorMembers,
  getStudentMembers,
  getAdvisorNotInCourse,
  getStudentsNotInCourse,
  deleteCourseMembers,
  addMembers,
  getStaffMembers,
  getStaffNotInCourse
} from "../model/courseMember.model";

import { CourseMemberPayload } from "src/types/payload/courseMember.type";
import { isValidUUID } from "src/types/uuid";
import { mailSentAndSummary } from "src/util/mailSummary";
import { courseMemberMail } from "src/mail/courseMember.mail";

export const CourseMemberController = {
  getStaffMembers: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const courseId = c.req.param("courseId");
      if (!courseId || courseId.trim().length === 0) {
        return c.json({ message: "Invalid courseId" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }

      const staff = await getStaffMembers(courseId);

      return c.json(
        {
          message: "Staff fetched successfully",
          staff: staff,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "getStaffMembers",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
  getStaffNotInCourse: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }
      const courseId = c.req.param("courseId");
      if (!courseId || courseId.trim().length === 0) {
        return c.json({ message: "Invalid courseId" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }
      const staffNotInCourse = await getStaffNotInCourse(courseId);

      return c.json(
        {
          message: "Staff not in course fetched successfully",
          staff: staffNotInCourse,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "getStaffMembers",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
  getAdvisorMembers: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const courseId = c.req.param("courseId");
      if (!courseId || courseId.trim().length === 0) {
        return c.json({ message: "Invalid courseId" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }

      const advisors = await getAdvisorMembers(courseId);

      return c.json(
        {
          message: "Advisors fetched successfully",
          advisors: advisors,
        },
        200
      );
    } catch (error) {
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

  getAdvisorNotInCourse: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const courseId = c.req.param("courseId");
      if (!courseId || courseId.trim().length === 0) {
        return c.json({ message: "Invalid courseId" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }

      const advisorsNotInCourse = await getAdvisorNotInCourse(courseId);

      return c.json(
        {
          message: "Advisors not in course fetched successfully",
          advisors: advisorsNotInCourse,
        },
        200
      );
    } catch (error) {
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

  getStudentNotInCourse: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const courseId = c.req.param("courseId");
      if (!courseId || courseId.trim().length === 0) {
        return c.json({ message: "Invalid courseId" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }

      const students = await getStudentsNotInCourse(courseId);

      return c.json(
        {
          message: "Students not in course fetched successfully",
          students: students,
        },
        200
      );
    } catch (error) {
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

  getStudentMembers: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const courseId = c.req.param("courseId");
      if (!courseId || courseId.trim().length === 0) {
        return c.json({ message: "Invalid courseId" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }

      const students = await getStudentMembers(courseId);

      return c.json(
        {
          message: "Student members fetched successfully",
          students: students,
        },
        200
      );
    } catch (error) {
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

  addMembers: async (c: Context) => {
    try {
      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const body = await c.req.json<CourseMemberPayload.AddMember>();
      const courseId = body.courseId;
      if (!courseId || courseId.trim().length === 0) {
        return c.json({ message: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }

      const raw = body.userIds;
      if (!Array.isArray(raw) || raw.length === 0) {
        return c.json({ message: "userIds must be a non-empty array" }, 400);
      }

      const userIds: string[] = [
        ...new Set(
          raw
            .map((v) => String(v))
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        ),
      ];
      if (userIds.length === 0) {
        return c.json({ message: "No valid userIds provided" }, 400);
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });
      if (!course) return c.json({ message: "Course not found" }, 404);

      const existingUsers = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });
      const existingIds = new Set(existingUsers.map((u) => u.id));
      const missingIds = userIds.filter((id) => !existingIds.has(id));
      if (missingIds.length > 0) {
        return c.json(
          { message: "Some users not found", missingUserIds: missingIds },
          404
        );
      }

      const results = await Promise.all(
        userIds.map((uid) => addMembers(courseId, uid))
      );
      const inserted = results.filter((r) => r.created);
      const insertedCount = results.filter((r) => r.created).length;
      const skippedAsDuplicates = results.length - insertedCount;

      //mail
      const coursename = await prisma.course
        .findUnique({ where: { id: courseId }, select: { name: true } })
        .then((c) => c?.name || "the course");

      const addedUserIds = inserted.map((r) => r.member.userId as string);

      const mailUsers = await prisma.user.findMany({
        where: { id: { in: addedUserIds } },
        select: { id: true, name: true, email: true },
      });

      await Promise.all(
        mailUsers.map(async (u) => {
          const { subject, html, text } = await courseMemberMail.addMemberMail(
            coursename,
            u.name,
            userId
          );

          await mailSentAndSummary(
            [{ email: u.email, name: u.name }],
            subject,
            html,
            text
          );
        })
      );

      return c.json(
        {
          message: "Members processed",
          requestedCount: userIds.length,
          insertedCount,
          skippedAsDuplicates,
          members: results.map((r) => r.member),
          existingUserIds: results
            .filter((r) => !r.created)
            .map((r) => r.member.userId as string),
        },
        201
      );
    } catch (e: any) {
      if (e?.code === "P2002") {
        return c.json(
          { message: "Some users are already members of this course" },
          409
        );
      }
      return c.json(
        { message: "Failed to add member(s)", error: String(e?.message ?? e) },
        500
      );
    }
  },

  deleteCourseMembers: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const body = await c.req.json<CourseMemberPayload.deleteMember>();
      const rawIds = body.courseMemberIds;

      if (!Array.isArray(rawIds) || rawIds.length === 0) {
        return c.json(
          { message: "Body must be { courseMemberIds: string[] }" },
          400
        );
      }

      const courseMemberIds = [
        ...new Set(
          rawIds
            .map(String)
            .map((s) => s.trim())
            .filter(Boolean)
        ),
      ];
      if (courseMemberIds.length === 0) {
        return c.json({ message: "No valid courseMemberIds provided" }, 400);
      }
      const invalidIds = courseMemberIds.filter((id) => !isValidUUID(id));
      if (invalidIds.length > 0) {
        return c.json(
          {
            message: "Invalid UUID(s) in courseMemberIds",
            invalidIds,
          },
          400
        );
      }
      const actorUserId = c.get("userId"); 
      if (!actorUserId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const coursename = await prisma.courseMember
        .findFirst({
          where: { id: { in: courseMemberIds } },
          select: { course: { select: { name: true } } },
        })
        .then((c) => c?.course.name || "the course");

      const mailUsers = await prisma.courseMember.findMany({
        where: { id: { in: courseMemberIds } },
        select: { user: { select: { name: true, email: true } } },
      });

      const result = await deleteCourseMembers(courseMemberIds);
      const status =
        result.blocked.length > 0 || result.notFoundIds.length > 0 ? 207 : 200;

      await Promise.all(
        mailUsers.map(async ({ user }) => {
          const { subject, html, text } =
            await courseMemberMail.deleteMemberMail(
              coursename,
              user.name,
              actorUserId, 
              new Date()
            );
          await mailSentAndSummary(
            [{ email: user.email, name: user.name }],
            subject,
            html,
            text
          );
        })
      );

      return c.json(
        {
          message: "Course member deletion processed",
          result,
        },
        status
      );
    } catch (e: any) {
      console.error({
        context: "deleteMemberForce",
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
      return c.json(
        { message: e?.message ?? "Failed to delete course member(s)" },
        e?.status ?? 500
      );
    }
  },
};
