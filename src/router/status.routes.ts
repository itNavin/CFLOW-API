import { Hono } from "hono";
import { StatusController } from "src/controller/status.controller";
import { authMiddleware } from "src/middleware/auth";

export const statusRouter = new Hono();

statusRouter.get(
  "/course/:courseId",
  StatusController.getAllGroupStatusInCourse
);
