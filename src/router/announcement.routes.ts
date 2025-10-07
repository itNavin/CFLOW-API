import { Hono } from "hono";
import { AnnouncementController } from "../controller/announcement.controller";

export const announcementRouter = new Hono();

announcementRouter.post(
  "/course",
  AnnouncementController.createAnnouncement
);
announcementRouter.put(
  "/update",
  AnnouncementController.updateAnnouncement
);

announcementRouter.delete(
  "/delete",
  AnnouncementController.deleteAnnouncement
);

announcementRouter.get("/course/:courseId", AnnouncementController.getAllAnnouncement);
