import type { Context } from "hono";
import SubmissionModel from "../model/submission.model";
import { SubmissionPayload } from "src/types/payload/submission.type";
import { isValidUUID } from "../types/uuid";

export const SubmissionController = {
  createSubmission: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "student") {
        return c.json({ error: "Forbidden: STUDENT only" }, 403);
      }

      const userId = c.get("userId");
      if (!userId) {
        return c.json({ error: "userId is required" }, 400);
      }

      const body = await c.req.json<SubmissionPayload.CreateSubmission>();
      const courseId = body.courseId;
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const assignmentId = body.assignmentId;
      if (!assignmentId) {
        return c.json({ error: "assignmentId is required" }, 400);
      }
      if (!isValidUUID(assignmentId)) {
        return c.json({ error: "assignmentId must be a valid UUID" }, 400);
      }

      const comment = body?.comment.trim();
      if (comment) {
        if (comment.length > 500) {
          return c.json({ error: "comment must be at most 500 characters" }, 400);
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
      if (msg.includes("already FINAL")) return c.json({ error: msg }, 409);
      if (msg.includes("No due date found")) return c.json({ error: msg }, 400);
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
