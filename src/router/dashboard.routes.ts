import { Hono } from "hono";
import { DashboardController } from "../controller/dashboard.controller";

export const dashboardRouter = new Hono();

dashboardRouter.get("/course/:courseId", DashboardController.getCourseSummaryUnified);

dashboardRouter.get("/group-information/course/:courseId", DashboardController.getGroupInformationDashboard);