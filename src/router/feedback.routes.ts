// src/routes/feedback.routes.ts
import { Hono } from "hono";
import { FeedbackController } from "../controller/feedback.controller";

export const feedbackRouter = new Hono();
feedbackRouter.post("/submission/:submissionId", FeedbackController.createFeedback);

// mount in main.routes.ts
// mainRouter.route("/feedback", feedbackRouter);
