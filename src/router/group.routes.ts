import { Hono } from "hono";
import {
  createGroupHandler,
  getAllGroupsHandler,
} from "../controller/group.controller";

export const groupRouter = new Hono();

groupRouter.post("/createGroup/:courseId", createGroupHandler);

// Add courseId param to filter groups by courseId
groupRouter.get("/groups/:courseId", getAllGroupsHandler);
