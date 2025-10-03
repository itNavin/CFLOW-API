import type { Context } from "hono";
import FeedbackModel from "../model/feedback.model";
import { FeedbackPayload } from "../types/payload/feedback.type";
import { isValidUUID } from "../types/uuid";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";

const ALLOWED_STATUSES = new Set([
  "REJECTED",
  "APPROVED_WITH_FEEDBACK",
  "FINAL",
]);

export const FeedbackController = {
  createFeedback: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "lecturer") {
        return c.json({ error: "Forbidden: LECTURER only" }, 403);
      }

      const body = await c.req.json<FeedbackPayload.CreateFeedback>();
      const submissionId = body.submissionId;
      if (!submissionId) {
        return c.json({ error: "submissionId is required" }, 400);
      }
      if (!isValidUUID(submissionId)) {
        return c.json({ error: "submissionId must be a valid UUID" }, 400);
      }

      const comment = body.comment?.trim();
      const newStatus = body.newStatus?.trim().toUpperCase();
      const newDueDateStr = body?.newDueDate;

      if (!ALLOWED_STATUSES.has(newStatus))
        return c.json(
          {
            error:
              "newStatus must be REJECTED | APPROVED_WITH_FEEDBACK | FINAL",
          },
          400
        );

      let newDueDate: Date | undefined;
      if (newStatus !== "FINAL") {
        if (!newDueDateStr)
          return c.json({ error: "newDueDate is required" }, 400);

        const parsed = new Date(newDueDateStr);
        if (isNaN(parsed.getTime()))
          return c.json(
            { error: "newDueDate must be a valid ISO datetime" },
            400
          );
        newDueDate = parsed;
      }

      const result = await FeedbackModel.createFeedback({
        submissionId,
        comment,
        newDueDate,
        newStatus: newStatus as any,
      });

      return c.json(
        {
          message: "Feedback created successfully",
          feedback: result.feedback,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "createFeedback",
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
