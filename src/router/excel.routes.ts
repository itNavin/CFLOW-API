// src/routes/import.routes.ts
import { Hono } from "hono";
import { ImportController } from "../controller/excel.controller";

export const importRouter = new Hono();

// GET /import/template/:courseId
importRouter.get("/template/course/:courseId", ImportController.downloadTemplate);

// POST /import/enroll/:courseId (multipart/form-data, file field name: "file")
importRouter.post("/enroll/course/:courseId", ImportController.uploadAndEnroll);
