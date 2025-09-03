import { Hono } from "hono";
import { StorageController } from "../controller/storage.controller";

export const storageRouter = new Hono();

storageRouter.post(
  "/presign-upload/course/:courseId",
  StorageController.presignUpload
);
storageRouter.post("/confirm", StorageController.confirmUpload);
storageRouter.get("/presign-download", StorageController.presignDownload);
