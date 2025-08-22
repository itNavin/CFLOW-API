// src/controller/feedback.controller.ts
import type { Context } from "hono";
import FeedbackModel from "../model/feedback.model";

const ALLOWED_STATUSES = new Set([
  "REJECTED",
  "APPROVED_WITH_FEEDBACK",
  "FINAL",
]);

export const FeedbackController = {
  // POST /feedback/:submissionId
  createFeedback: async (c: Context) => {
    try {
      const submissionId = Number(c.req.param("submissionId"));
      if (!Number.isFinite(submissionId)) {
        return c.json({ error: "Invalid submissionId" }, 400);
      }

      const body = await c.req.json();
      const comment = String(body?.comment ?? "").trim();
      const newStatus = String(body?.newStatus ?? "")
        .trim()
        .toUpperCase();
      const newDueDateStr = body?.newDueDate;

      if (!comment) return c.json({ error: "comment is required" }, 400);
      if (!ALLOWED_STATUSES.has(newStatus))
        return c.json(
          {
            error:
              "newStatus must be REJECTED | APPROVED_WITH_FEEDBACK | FINAL",
          },
          400
        );
      if (!newDueDateStr)
        return c.json({ error: "newDueDate is required" }, 400);

      const newDueDate = new Date(newDueDateStr);
      if (isNaN(newDueDate.getTime()))
        return c.json(
          { error: "newDueDate must be a valid ISO datetime" },
          400
        );

      const filesRaw = Array.isArray(body?.files) ? body.files : [];
      const files: { deliverableId: number; fileUrls: string[] }[] =
        filesRaw.map((f: any) => ({
          deliverableId: Number(f?.deliverableId),
          fileUrls: Array.isArray(f?.fileUrls)
            ? f.fileUrls.map((u: any) => String(u ?? "").trim()).filter(Boolean)
            : [],
        }));
      if (files.some((f) => !Number.isFinite(f.deliverableId))) {
        return c.json(
          { error: "Each file must include a valid deliverableId" },
          400
        );
      }

      const result = await FeedbackModel.createFeedback({
        submissionId,
        comment,
        files,
        newDueDate,
        newStatus: newStatus as any,
      });

      return c.json(result, 201);
    } catch (err: any) {
      console.error("Error creating feedback:", err);
      return c.json(
        { error: err?.message ?? "Failed to create feedback" },
        400
      );
    }
  },
};
