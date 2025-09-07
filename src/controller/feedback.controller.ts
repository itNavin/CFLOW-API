import type { Context } from "hono";
import FeedbackModel from "../model/feedback.model";
import { FeedbackPayload } from "../types/payload/feedback.type";

const ALLOWED_STATUSES = new Set([
  "REJECTED",
  "APPROVED_WITH_FEEDBACK",
  "FINAL",
]);

export const FeedbackController = {
  // POST /feedback/:submissionId
  createFeedback: async (c: Context) => {
    try {
      const role = c.get("role");
      console.log("role", role);
      
      if (role !== "lecturer") {
        return c.json({ error: "Forbidden: LECTURER only" }, 403);
      }

      const submissionId = Number(c.req.param("submissionId"));
      console.log("submissionId", submissionId);
      
      if (!Number.isFinite(submissionId)) {
        return c.json({ error: "Invalid submissionId" }, 400);
      }

      const body = await c.req.json<FeedbackPayload.CreateFeedback>();
      const comment = body.comment.trim();
      const newStatus = body.newStatus
        .trim()
        .toUpperCase();
      const newDueDateStr = body.newDueDate;

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

      // const filesRaw = body.files
      // const files =
      //   filesRaw.map((f) => ({
      //     deliverableId: f.deliverableId,
      //     fileUrls: Array.isArray(f.fileUrls)
      //       ? f.fileUrls.map((u: any) => String(u ?? "").trim()).filter(Boolean)
      //       : [],
      //   }));
      // if (files.some((f) => !(f.deliverableId))) {
      //   return c.json(
      //     { error: "Each file must include a valid deliverableId" },
      //     400
      //   );
      // }

      const result = await FeedbackModel.createFeedback({
        submissionId,
        comment,
        // files,
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
