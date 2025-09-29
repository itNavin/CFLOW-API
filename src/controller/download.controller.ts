import type { Context } from "hono";
import { DownloadModel } from "src/model/download.model";
import { isValidUUID } from "src/types/uuid";

export const DownloadController = {
  downloadFile: async (c: Context) => {
    try {
      const fileId = c.req.param("fileId");
      if (!fileId) return c.json({ message: "fileId is required" }, 400);
      if (!isValidUUID(fileId)) {
        return c.json({ message: "fileId must be a valid UUID" }, 400);
      }

      const url = await DownloadModel.getFileDownloadUrl(fileId);
      if (!url) return c.json({ message: "File not found" }, 404);

      return c.json(
        {
          message: "File download URL fetched successfully",
          url: url,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "downloadFile",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  downloadSubmissionFile: async (c: Context) => {
    try {
      const submissionFileId = c.req.param("submissionFileId");
      if (!submissionFileId) {
        return c.json({ message: "submissionFileId is required" }, 400);
      }
      if (!isValidUUID(submissionFileId)) {
        return c.json(
          { message: "submissionFileId must be a valid UUID" },
          400
        );
      }

      const url = await DownloadModel.getSubmissionFileDownloadUrl(
        submissionFileId
      );
      if (!url) return c.json({ message: "File not found" }, 404);

      return c.json(
        {
          message: "Submission file download URL fetched successfully",
          url: url,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "downloadSubmissionFile",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  downloadFeedbackFile: async (c: Context) => {
    try {
      const feedbackFileId = c.req.param("feedbackFileId");
      if (!feedbackFileId) {
        return c.json({ message: "feedbackFileId is required" }, 400);
      }
      if (!isValidUUID(feedbackFileId)) {
        return c.json({ message: "feedbackFileId must be a valid UUID" }, 400);
      }

      const url = await DownloadModel.getFeedbackFileDownloadUrl(
        feedbackFileId
      );
      if (!url) return c.json({ message: "File not found" }, 404);

      return c.json(
        {
          message: "Feedback file download URL fetched successfully",
          url: url,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "downloadFeedbackFile",
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
