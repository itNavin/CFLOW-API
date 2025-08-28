import { Hono } from "hono";
import { AnnouncementController } from "../controller/announcement.controller";

export const announcementRouter = new Hono();

announcementRouter.post(
  "/course/:courseId",
  AnnouncementController.createAnnouncement
);

announcementRouter.get("/course/:courseId", AnnouncementController.getAllAnnouncement);
