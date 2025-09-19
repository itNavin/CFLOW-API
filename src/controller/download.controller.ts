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

      return c.json({ url }, 200);
    } catch (e: any) {
      return c.json({ message: e?.message ?? "Failed to get file URL" }, 500);
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

      return c.json({ url }, 200);
    } catch (e: any) {
      return c.json(
        { message: e?.message ?? "Failed to get submission file URL" },
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

      return c.json({ url }, 200);
    } catch (e: any) {
      return c.json(
        { message: e?.message ?? "Failed to get feedback file URL" },
        500
      );
    }
  },
};
