// src/routes/submission.routes.ts
import { Hono } from "hono";
import { SubmissionController } from "../controller/submission.controller";

export const submissionRouter = new Hono();

submissionRouter.post(
  "/:assignmentId/group/:groupId",
  SubmissionController.createSubmission
);
