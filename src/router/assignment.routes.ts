import { Hono } from "hono";
import { AssignmentController } from "../controller/assignment.controller";

export const assignmentRouter = new Hono();

// Create an assignment (with deliverables + allowed file types)
assignmentRouter.post(
  "/create/course/:courseId", AssignmentController.createAssignment
);

// List all assignments for a course
assignmentRouter.get(
  "/:courseId", AssignmentController.getAllAssignments
);

// Get single assignment (by assignmentId) + submissions for a specific group
assignmentRouter.get(
  "/:assignmentId/group/:groupId", AssignmentController.getAssignmentWithSubmissions
);