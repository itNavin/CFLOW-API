import { Hono } from "hono";
import { AnnouncementController } from "../controller/announcement.controller";

export const announcementRouter = new Hono();

// Create an announcement for a course
// Body: { name, description, schedule, createById }
announcementRouter.post(
  "/:courseId",
  AnnouncementController.createAnnouncement
);

// List announcements for a course
// Default: published only (schedule <= now). Use ?all=true to include future ones.
announcementRouter.get("/:courseId", AnnouncementController.getAllAnnouncement);
