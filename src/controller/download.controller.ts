// controller/download.controller.ts
import type { Context } from "hono";
import { DownloadModel } from "src/model/download.model";
import {
  buildPublicFileUrl,
  ensureOrigin,
} from "src/util/storage";
import { isValidUUID } from "src/types/uuid";

function getMode(c: Context): "inline" | "download" {
  const m = (c.req.query("mode") || "").toLowerCase();
  return m === "download" ? "download" : "inline";
}

export const DownloadController = {
  downloadFile: async (c: Context) => {
    try {
      const fileId = c.req.param("fileId");
      if (!fileId) return c.json({ message: "fileId is required" }, 400);
      if (!isValidUUID(fileId))
        return c.json({ message: "fileId must be a valid UUID" }, 400);

      const meta = await DownloadModel.getFileKeyAndMeta(fileId);
      if (!meta) return c.json({ message: "File not found" }, 404);

      const mode = getMode(c);
      const originCandidate =
        c.req.header("origin") ?? new URL(c.req.url).origin;
      const origin = ensureOrigin(originCandidate);
      const url = buildPublicFileUrl(meta.objectKey, meta.filename, origin, {
        mode,
      });

      return c.json({ message: "OK", url }, 200);
    } catch (error) {
      console.error({ context: "downloadFile", error });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  downloadSubmissionFile: async (c: Context) => {
    try {
      const submissionFileId = c.req.param("submissionFileId");
      if (!submissionFileId)
        return c.json({ message: "submissionFileId is required" }, 400);
      if (!isValidUUID(submissionFileId))
        return c.json(
          { message: "submissionFileId must be a valid UUID" },
          400
        );

      const meta = await DownloadModel.getSubmissionKeyAndMeta(
        submissionFileId
      );
      if (!meta) return c.json({ message: "File not found" }, 404);

      const mode = getMode(c);
      const originCandidate =
        c.req.header("origin") ?? new URL(c.req.url).origin;
      const origin = ensureOrigin(originCandidate);
      const url = buildPublicFileUrl(meta.objectKey, meta.filename, origin, {
        mode,
      });

      return c.json({ message: "OK", url }, 200);
    } catch (error) {
      console.error({ context: "downloadSubmissionFile", error });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  downloadFeedbackFile: async (c: Context) => {
    try {
      const feedbackFileId = c.req.param("feedbackFileId");
      if (!feedbackFileId)
        return c.json({ message: "feedbackFileId is required" }, 400);
      if (!isValidUUID(feedbackFileId))
        return c.json({ message: "feedbackFileId must be a valid UUID" }, 400);

      const meta = await DownloadModel.getFeedbackKeyAndMeta(feedbackFileId);
      if (!meta) return c.json({ message: "File not found" }, 404);

      const mode = getMode(c);
      const originCandidate =
        c.req.header("origin") ?? new URL(c.req.url).origin;
      const origin = ensureOrigin(originCandidate);
      const url = buildPublicFileUrl(meta.objectKey, meta.filename, origin, {
        mode,
      });

      return c.json({ message: "OK", url }, 200);
    } catch (error) {
      console.error({ context: "downloadFeedbackFile", error });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
};
