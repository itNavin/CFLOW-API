import type { Context } from "hono";
import SubmissionModel from "../model/submission.model";
import { SubmissionPayload } from "src/types/payload/submission.type";
import { isValidUUID } from "../types/uuid";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";
import { submissionMail } from "src/mail/submission.mail";
import { prisma } from "src/prisma";
import GroupModel from "src/model/group.model";

export const SubmissionController = {
  hasSubmission: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "student" && role !== "lecturer" && role !== "staff") {
        return c.json({ message: "Forbidden: only students, lecturers, and staff can access this resource" }, 403);
      }
      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      const assignmentId = c.req.param("assignmentId");
      if (!assignmentId) {
        return c.json({ message: "assignmentId is required" }, 400);
      }
      if (!isValidUUID(assignmentId)) {
        return c.json({ message: "assignmentId must be a valid UUID" }, 400);
      }
      const courseId = await SubmissionModel.getCourseIdByAssignment(assignmentId);
      if (!courseId) {
        return c.json({ message: "No course found for the given assignmentId" }, 400);
      }

      const groupId = await SubmissionModel.getGroupIdByUserAndCourse(userId, courseId);
      if (!groupId) {
        return c.json({ message: "User is not part of any group in this course" }, 400);
      }

      const subs = await SubmissionModel.hasSubmission({
        groupId,
        assignmentId,
      });

      if (!subs || subs.length === 0) {
        return c.json({ hasSubmission: false }, 200);
      }

      const latest = subs[0];
      return c.json(
        {
          hasSubmission: true,
          submission: latest, 
        },
        200
      );

    } catch (error) {
      console.error({
        context: "hasSubmission",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
  createSubmission: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "student") {
        return c.json({ message: "Forbidden: STUDENT only" }, 403);
      }

      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "userId is required" }, 400);
      }

      const body = await c.req.json<SubmissionPayload.CreateSubmission>();

      const assignmentId = body.assignmentId;
      if (!assignmentId) {
        return c.json({ message: "assignmentId is required" }, 400);
      }
      if (!isValidUUID(assignmentId)) {
        return c.json({ message: "assignmentId must be a valid UUID" }, 400);
      }
      const courseId = await SubmissionModel.getCourseIdByAssignment(
        assignmentId
      );
      if (!courseId) {
        return c.json(
          { message: "No course found for the given assignmentId" },
          400
        );
      }

      const comment = body?.comment.trim();
      if (comment) {
        if (comment.length > 500) {
          return c.json(
            { message: "comment must be at most 500 characters" },
            400
          );
        }
      }

      const created = await SubmissionModel.createSubmission({
        userId,
        courseId,
        assignmentId,
        comment,
      });

      c.header("Location", `/submission/${created.id}`);

      return c.json(
        {
          message: "Submission created successfully",
          submission: created,
        },
        201
      );
    } catch (error: any) {
      const msg =
        typeof error?.message === "string"
          ? error.message
          : "Failed to create submission";
      if (msg.includes("already FINAL")) return c.json({ message: msg }, 409);
      if (msg.includes("No due date found")) return c.json({ message: msg }, 400);
      console.error("Error creating submission:", error);
      console.error({
        context: "createSubmission",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json({ message: "Failed to create submission" }, 500);
    }
  },
};
