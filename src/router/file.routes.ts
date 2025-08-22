import { Hono } from "hono";
import { FileController } from "../controller/file.controller";

export const fileRouter = new Hono();

fileRouter.post("/", FileController.createFile); // you already have this
fileRouter.get("/", FileController.getAllFiles); // ✅ list files with filters
