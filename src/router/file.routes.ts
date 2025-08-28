import { Hono } from "hono";
import { FileController } from "../controller/file.controller";

export const fileRouter = new Hono();

fileRouter.post("/", FileController.createFile); 

fileRouter.get("/", FileController.getAllFiles);
