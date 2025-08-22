// src/routes/dashboard.routes.ts
import { Hono } from "hono";
import { DashboardController } from "../controller/dashboard.controller";

export const dashboardRouter = new Hono();

// GET /dashboard/course/:courseId
dashboardRouter.get("/course/:courseId", DashboardController.getCourseSummary);

// GET /dashboard/course/:courseId/assignment/:assignmentId
dashboardRouter.get(
  "/course/:courseId/assignment/:assignmentId",
  DashboardController.getCourseSummaryByAssignment
);

// GET /dashboard/course/:courseId/group/:groupId
dashboardRouter.get(
  "/course/:courseId/group/:groupId",
  DashboardController.getCourseSummaryByGroup
);

// (fixed typo 'asssignment' -> 'assignment')
// GET /dashboard/course/:courseId/assignment/:assignmentId/group/:groupId
dashboardRouter.get(
  "/course/:courseId/assignment/:assignmentId/group/:groupId",
  DashboardController.getCourseSummaryByAssignmentAndGroup
);
