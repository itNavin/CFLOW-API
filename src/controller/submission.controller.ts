// src/controller/submission.controller.ts
import type { Context } from "hono";
import SubmissionModel from "../model/submission.model";

export const SubmissionController = {
  createSubmission: async (c: Context) => {
    try {
      const assignmentId = Number(c.req.param("assignmentId"));
      const groupId = Number(c.req.param("groupId"));
      if (!assignmentId || Number.isNaN(assignmentId)) {
        return c.json({ error: "Invalid assignmentId" }, 400);
      }
      if (!groupId || Number.isNaN(groupId)) {
        return c.json({ error: "Invalid groupId" }, 400);
      }

      const body = await c.req.json();
      const missed = Boolean(body?.missed);
      const comment = String(body?.comment ?? "").trim();

      if (!comment) {
        return c.json({ error: "comment is required" }, 400);
      }

      const filesRaw = Array.isArray(body?.files) ? body.files : [];
      const files = filesRaw.map((f: any) => ({
        deliverableId: Number(f?.deliverableId),
        fileUrls: Array.isArray(f?.fileUrls)
          ? f.fileUrls.map((u: any) => String(u ?? "").trim()).filter(Boolean)
          : [],
      }));

      if (!missed && files.length === 0) {
        return c.json({ error: "files are required when missed=false" }, 400);
      }

      const created = await SubmissionModel.createSubmission({
        assignmentId,
        groupId,
        missed,
        comment,
        files,
      });

      c.header("Location", `/submission/${created.id}`);
      return c.json(created, 201);
    } catch (err: any) {
      console.error("Error creating submission:", err);
      return c.json(
        { error: err?.message ?? "Failed to create submission" },
        400
      );
    }
  },
};
