import { Hono } from "hono";
import { GroupController } from "../controller/group.controller";

export const groupRouter = new Hono();

groupRouter.post("/createGroup/course/:courseId", GroupController.createGroup);

groupRouter.get("/course/:courseId", GroupController.getAllGroups);

groupRouter.patch("/course/:courseId/group/:groupId", GroupController.updateGroup);
