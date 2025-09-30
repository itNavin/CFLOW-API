import { Hono } from "hono";
import { FileController } from "../controller/file.controller";
import { file } from "bun";

export const fileRouter = new Hono();

fileRouter.post("/create/course/:courseId", FileController.createFile); 

fileRouter.get("/", FileController.getAllFiles);

fileRouter.get("/course/:courseId", FileController.getFilesByCourseId);

fileRouter.delete("/deleteFile", FileController.deleteFile);