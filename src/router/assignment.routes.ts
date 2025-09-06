import { Hono } from "hono";
import { AssignmentController } from "../controller/assignment.controller";

export const assignmentRouter = new Hono();

assignmentRouter.post(
  "/create/course/:courseId",
  AssignmentController.createAssignment
);

assignmentRouter.get(
  "/course/:courseId",
  AssignmentController.getAllAssignments
);

assignmentRouter.get(
  "/:assignmentId/group/:groupId",
  AssignmentController.getAssignmentWithSubmissions
);

assignmentRouter.get(
  "/course/:courseId/group/:groupId/summary",
  AssignmentController.getAssignmentsByGroup
);

assignmentRouter.get("/course/:courseId/groupAdvisor", AssignmentController.getGroupByLecturerId)