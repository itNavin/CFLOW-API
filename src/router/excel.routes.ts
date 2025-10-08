import { Hono } from "hono";
import { ImportController } from "../controller/excel.controller";

export const importRouter = new Hono();
importRouter.post("/enroll", ImportController.uploadAndEnroll);
