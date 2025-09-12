import { Context } from "hono";
import AnnouncementModel from "../model/announcement.model";
import { AnnouncementPayload } from "../types/payload//announcement.type";
import { isValidUUID } from "../types/uuid";

export const AnnouncementController = {
  createAnnouncement: async (c: Context) => {
    try {
      const role = c.get("role");
      const userId = c.get("userId");
      if (role !== "staff" && role !== "lecturer" && role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden: STAFF and LECTURER only" }, 403);
      }

      const body = await c.req.json<AnnouncementPayload.CreateAnnouncement>();

      const courseId = body.courseId;
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const name = body.name ? body.name.trim() : undefined;
      const description = body.description
        ? body.description.trim()
        : undefined;

      const scheduleStr = body.schedule;
      const schedule = new Date(scheduleStr);
      if (!name) return c.json({ error: "name is required" }, 400);
      if (!description)
        return c.json({ error: "description is required" }, 400);
      if (!schedule || isNaN(schedule.getTime())) {
        return c.json(
          { error: "schedule must be a valid ISO datetime string" },
          400
        );
      }

      const created = await AnnouncementModel.createAnnouncement({
        courseId,
        name,
        description,
        schedule,
        userId,
      });

      return c.json(
        {
          message: "The announcement has been created successfully",
          announcement: created,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "createAnnouncement",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
  
  getAllAnnouncement: async (c: Context) => {
    try {
      const courseId = c.req.param("courseId");
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const url = new URL(c.req.url);
      const all = url.searchParams.get("all");
      const publishedOnly = !(all && all.toLowerCase() === "true");

      const rows = await AnnouncementModel.getAllAnnouncement(
        courseId,
        publishedOnly
      );
      return c.json(
        {
          message: "The announcements have been fetched successfully",
          announcements: rows,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "getAllAnnouncement",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
};
