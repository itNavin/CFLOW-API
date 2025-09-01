import { Hono } from "hono";
import { DashboardController } from "../controller/dashboard.controller";

export const dashboardRouter = new Hono();

dashboardRouter.get("/course/:courseId", DashboardController.getCourseSummaryUnified);

// dashboardRouter.get(
//   "/course/:courseId/assignment/:assignmentId",
//   DashboardController.getCourseSummaryByAssignment
// );

// dashboardRouter.get(
//   "/course/:courseId/group/:groupId",
//   DashboardController.getCourseSummaryByGroup
// );

// dashboardRouter.get(
//   "/course/:courseId/assignment/:assignmentId/group/:groupId",
//   DashboardController.getCourseSummaryByAssignmentAndGroup
// );
