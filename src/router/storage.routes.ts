import { Hono } from "hono";
import { StorageController } from "../controller/storage.controller";

export const storageRouter = new Hono();

storageRouter.post(
  "/upload/file",
  StorageController.uploadCourseFile
);
storageRouter.post(
  "/upload/assignment",
  StorageController.uploadAssignmentFile
);

storageRouter.post(
  "/upload/submission",
  StorageController.uploadSubmissionFile
);
storageRouter.post(
  "/upload/feedback",
  StorageController.uploadFeedbackFile
);