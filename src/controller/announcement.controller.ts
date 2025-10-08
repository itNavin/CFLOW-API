import { Context } from "hono";
import AnnouncementModel from "../model/announcement.model";
import { AnnouncementPayload } from "../types/payload//announcement.type";
import { isValidUUID } from "../types/uuid";
import { mailRoles } from "src/util/mailRole";
import { announcementMail } from "src/mail/announcement.mail";
import { sendEmail } from "src/lib/mailer";
import { mailSentAndSummary } from "src/util/mailSummary";

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
      //mail
      // const mailUsers = await mailRoles.getAllUsersInCourse(courseId);
      const mailUsers = await mailRoles.test(courseId);
      const courseRow = await mailRoles.coursename(courseId);
      if (!courseRow) return c.json({ error: "Course not found" }, 404);

      await mailSentAndSummary(mailUsers, async (u) => {
        const recipientName = u?.user?.name || u?.name || "User";
        return announcementMail.createAnnouncementMail(
          courseRow.name,
          created,
          recipientName
        );
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
  updateAnnouncement: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff" && role !== "lecturer" && role !== "SUPER_ADMIN") {
        return c.json({ message: "Forbidden: STAFF and LECTURER only" }, 403);
      }
      const body = await c.req.json<AnnouncementPayload.UpdateAnnouncement>();
      const announcementId = body.announcementId;
      if (!announcementId) {
        return c.json({ message: "announcementId is required" }, 400);
      }
      if (!isValidUUID(announcementId)) {
        return c.json({ message: "Invalid announcementId format" }, 400);
      }
      const name = body.name ? body.name.trim() : undefined;
      const description = body.description
        ? body.description.trim()
        : undefined;
      const scheduleStr = body.schedule;
      const schedule = new Date(scheduleStr);
      if (!name) return c.json({ message: "name is required" }, 400);

      const courseId = await AnnouncementModel.getCourseIdByAnnouncementId(
        announcementId
      );
      if (!courseId) {
        return c.json(
          { message: "Course not found for this announcement" },
          404
        );
      }

      const updated = await AnnouncementModel.updateAnnouncement(
        announcementId,
        name,
        description,
        schedule
      );
      if (!updated) {
        return c.json({ message: "Announcement not found" }, 404);
      }

      //mail
      // const mailUsers = await mailRoles.getAllUsersInCourse(courseId);
      const mailUsers = await mailRoles.test(courseId.courseId);
      const courseRow = await mailRoles.coursename(courseId.courseId);
      if (!courseRow) return c.json({ error: "Course not found" }, 404);

      await mailSentAndSummary(mailUsers, async (u) => {
        const recipientName = u?.user?.name || u?.name || "User";
        return announcementMail.updateAnnouncementMail(
          courseRow.name,
          updated,
          recipientName
        );
      });


      return c.json(
        {
          message: "The announcement has been updated successfully",
          announcement: updated,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "updateAnnouncement",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  deleteAnnouncement: async (c: Context) => {
    try {
      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      const role = c.get("role");
      if (role !== "staff" && role !== "lecturer" && role !== "SUPER_ADMIN") {
        return c.json({ message: "Forbidden: STAFF and LECTURER only" }, 403);
      }
      const body = await c.req.json<{ announcementId: string }>();
      const announcementId = body.announcementId;
      if (!announcementId) {
        return c.json({ message: "announcementId is required" }, 400);
      }
      if (!isValidUUID(announcementId)) {
        return c.json({ message: "Invalid announcementId format" }, 400);
      }
      const courseId = await AnnouncementModel.getCourseIdByAnnouncementId(
        announcementId
      );
      console.log("courseId:", courseId);
      if (!courseId) {
        return c.json(
          { message: "Course not found for this announcement" },
          404
        );
      }

      const deleted = await AnnouncementModel.deleteAnnouncement(
        announcementId
      );
      if (!deleted) {
        return c.json({ message: "Announcement not found" }, 404);
      }

      //mail
      const mailUsers = await mailRoles.getStaffInCourse(deleted.courseId);
      const courseRow = await mailRoles.coursename(courseId.courseId);
      if (!courseRow) return c.json({ error: "Course not found" }, 404);

      await mailSentAndSummary(mailUsers, async (u) => {
        const recipientName = u?.user?.name || u?.name || "User";
        return announcementMail.deleteAnnouncementMail(
          userId,
          courseRow.name,
          deleted,
          recipientName
        );
      });

      return c.json(
        {
          message: "The announcement has been deleted successfully",
          announcement: deleted,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "deleteAnnouncement",
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
