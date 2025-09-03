import { Context } from "hono";
import AnnouncementModel from "../model/announcement.model";
import { AnnouncementPayload } from "../types/payload//announcement.type";

export const AnnouncementController = {
  // POST /announcement/create/:courseId
  createAnnouncement: async (c: Context) => {
    try {
      const role = c.get("role");
      const userId = c.get("userId");
      console.log("User role:", role);
      if (role !== "ADVISOR" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden: ADVISOR and ADMIN only" }, 403);
      }
      const courseId = Number(c.req.param("courseId"));
      if (!courseId || Number.isNaN(courseId)) {
        return c.json({ error: "Invalid courseId" }, 400);
      }

      const body = await c.req.json<AnnouncementPayload.CreateAnnouncement>();

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

      // const createById = body.createById;
      // if (!createById || Number.isNaN(createById)) {
      //   return c.json(
      //     { error: "createById is required and must be a number" },
      //     400
      //   );
      // }

      // const files = Array.isArray(body.files)
      //   ? body.files.map(
      //       (f) => ({
      //         name: f.name.trim(),
      //         filepath: f.filepath.trim(),
      //         uploadById: f.uploadById,
      //       })
      //     )
      //   : undefined;

      const created = await AnnouncementModel.createAnnouncement({
        courseId,
        name,
        description,
        schedule,
        userId,
        // files,
      });

      return c.json(created, 201);
    } catch (err: any) {
      console.error("Error creating announcement:", err);
      return c.json({ error: "Failed to create announcement" }, 500);
    }
  },
  
  // GET /announcement/:courseId
  getAllAnnouncement: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      if (!courseId || Number.isNaN(courseId)) {
        return c.json({ error: "Invalid courseId" }, 400);
      }
      const url = new URL(c.req.url);
      const all = url.searchParams.get("all");
      const publishedOnly = !(all && all.toLowerCase() === "true");

      const rows = await AnnouncementModel.getAllAnnouncement(
        courseId,
        publishedOnly
      );
      return c.json(rows, 200);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      return c.json({ error: "Failed to fetch announcements" }, 500);
    }
  },
};
