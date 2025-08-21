import { Hono } from "hono";
import { DashboardController } from "../controller/dashboard.controller";

export const dashboardRouter = new Hono();

// GET /dashboard/course/:courseId
dashboardRouter.get("/course/:courseId", DashboardController.getCourseSummary);
