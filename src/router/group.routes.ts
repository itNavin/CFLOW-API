import { Hono } from "hono";
import { GroupController } from "../controller/group.controller";

export const groupRouter = new Hono();

groupRouter.post("/createGroup", GroupController.createGroup);
groupRouter.get("/course/:courseId", GroupController.getAllGroups);
groupRouter.patch("/updateGroup", GroupController.updateGroup);