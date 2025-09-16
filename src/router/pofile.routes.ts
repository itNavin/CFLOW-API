import { Hono } from "hono";
import { ProfileController } from "src/controller/profile.controller";

export const profileRouter = new Hono();
profileRouter.get("/getProfile", ProfileController.getProfile);
profileRouter.get("/getProfileByUserId/:userId", ProfileController.getProfileByUserId);