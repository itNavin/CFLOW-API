import { Hono } from "hono";
import { ActivityController } from "../controller/activity.controller";

export const activityRouter = new Hono();

activityRouter.get("/user", ActivityController.getActivitiesByUserId);