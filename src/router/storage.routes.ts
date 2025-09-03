import { Hono } from "hono";
import { StorageController } from "../controller/storage.controller";

export const storageRouter = new Hono();

storageRouter.post(
  "/upload/course/:courseId",
  StorageController.uploadCourseFile
);

storageRouter.post(
  "/upload/submission/course/:courseId",
  StorageController.UploadSubmissionFile
);
storageRouter.post(
  "/upload/feedback/course/:courseId",
  StorageController.UploadFeedbackFile
);