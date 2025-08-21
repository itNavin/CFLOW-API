// routes/group.route.ts
import { Hono } from "hono";
import { GroupController } from "../controller/group.controller";

export const groupRouter = new Hono();

// Create a group
groupRouter.post("/createGroup/:courseId", GroupController.createGroup);

// List all groups in a course
groupRouter.get("/:courseId", GroupController.getAllGroups);

// ✅ Update a group (partial update + replace relations if provided)
groupRouter.patch("/:courseId/:groupId", GroupController.updateGroup);
