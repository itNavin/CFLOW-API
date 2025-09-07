import { Hono } from "hono";
import { SubmissionController } from "../controller/submission.controller";

export const submissionRouter = new Hono();

submissionRouter.post(
  "/course/:courseId/assignment/:assignmentId",
  SubmissionController.createSubmission
);
