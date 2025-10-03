import { Hono } from "hono";
import { SubmissionController } from "../controller/submission.controller";

export const submissionRouter = new Hono();

submissionRouter.post(
  "/create",
  SubmissionController.createSubmission
);

submissionRouter.get(
  "/hasSubmission/assignment/:assignmentId",
  SubmissionController.hasSubmission
);
