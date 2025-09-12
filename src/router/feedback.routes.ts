import { Hono } from "hono";
import { FeedbackController } from "../controller/feedback.controller";

export const feedbackRouter = new Hono();

feedbackRouter.post(
  "/create",
  FeedbackController.createFeedback
);
