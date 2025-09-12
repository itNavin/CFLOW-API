import { Hono } from "hono";
import { StorageController } from "../controller/storage.controller";

export const storageRouter = new Hono();

storageRouter.post(
  "/upload/course/:courseId",
  StorageController.uploadCourseFile
);

storageRouter.post(
  "/upload/submission",
  StorageController.UploadSubmissionFile
);
storageRouter.post(
  "/upload/feedback",
  StorageController.UploadFeedbackFile
);