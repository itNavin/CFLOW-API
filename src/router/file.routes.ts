import { Hono } from "hono";
import { FileController } from "../controller/file.controller";

export const fileRouter = new Hono();

fileRouter.post("/create/course/:courseId", FileController.createFile); 

fileRouter.get("/", FileController.getAllFiles);

fileRouter.get("/course/:courseId", FileController.getFilesByCourseId);
