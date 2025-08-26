import { Hono } from "hono";
import { FilenameController } from "../controller/filename.controller";

export const filenameRouter = new Hono();

filenameRouter.post("/change", FilenameController.changeFileName);
