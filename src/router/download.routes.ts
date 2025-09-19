import { Hono } from "hono";
import { DownloadController } from "src/controller/download.controller";

export const downloadRouter = new Hono();

downloadRouter.get(
  "/file/:fileId",
  DownloadController.downloadFile
);
downloadRouter.get(
  "/submission/:submissionFileId",
  DownloadController.downloadSubmissionFile
);
downloadRouter.get(
  "/feedback/:feedbackFileId",
  DownloadController.downloadFeedbackFile
);
