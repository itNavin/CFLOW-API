import type { Context } from "hono";
import SubmissionModel from "../model/submission.model";
import { SubmissionPayload } from "src/types/payload/submission.type";

export const SubmissionController = {
  // POST /submission/course/:courseId/assignment/:assignmentId
  createSubmission: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "student") {
        return c.json({ error: "Forbidden: STUDENT only" }, 403);
      }

      const assignmentId = Number(c.req.param("assignmentId"));
      const courseId = Number(c.req.param("courseId"));
      const userId = c.get("userId");
      console.log("userId", userId);
      console.log("courseId", courseId);
      console.log("assignmentId", assignmentId);
      

      if (!Number.isFinite(assignmentId))
        return c.json({ error: "Invalid assignmentId" }, 400);

      const body = await c.req.json<SubmissionPayload.CreateSubmission>();
      const comment = body?.comment.trim();

      const created = await SubmissionModel.createSubmission({
        userId,
        courseId,
        assignmentId,
        comment,
      });

      c.header("Location", `/submission/${created.id}`);
      return c.json(created, 201);
    } catch (err: any) {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : "Failed to create submission";
      if (msg.includes("already FINAL")) return c.json({ error: msg }, 409);
      if (msg.includes("No due date found")) return c.json({ error: msg }, 400);
      console.error("Error creating submission:", err);
      return c.json({ error: msg }, 400);
    }
  },
};
