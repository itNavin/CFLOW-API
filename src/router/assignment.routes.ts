import { Hono } from "hono";
import { AssignmentController } from "../controller/assignment.controller";

export const assignmentRouter = new Hono();

assignmentRouter.post(
  "/create",
  AssignmentController.createAssignment
);

assignmentRouter.put(
  "/update",
  AssignmentController.updateAssignment
);

assignmentRouter.delete(
  "/delete",
  AssignmentController.deleteAssignment
)

//For advisor and staff
assignmentRouter.get(
  "/getAllAssignments/course/:courseId",
  AssignmentController.getAllAssignmentsByCourseId
);

//For student
assignmentRouter.get(
  "/getStudentAssignmentByGroupId/course/:courseId",
  AssignmentController.getStudentAssignmentByGroupId
);

assignmentRouter.get(
  "/getSubmissionDetail/course/:courseId/assignment/:assignmentId",
  AssignmentController.getAssignmentWithSubmissions
);
assignmentRouter.get(
  "/getSubmissionDetail/course/:courseId/assignment/:assignmentId/group/:groupId",
  AssignmentController.getAssignmentWithSubmissions
);

assignmentRouter.get(
  "/getGroupByLecturerId/course/:courseId",
  AssignmentController.getGroupByLecturerId
);
