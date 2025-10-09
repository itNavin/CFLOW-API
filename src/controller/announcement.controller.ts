import { Context } from "hono";
import AnnouncementModel from "../model/announcement.model";
import { AnnouncementPayload } from "../types/payload//announcement.type";
import { isValidUUID } from "../types/uuid";
import { mailRoles } from "src/util/mailRole";
import { announcementMail } from "src/mail/announcement.mail";
import { sendEmail } from "src/lib/mailer";
import { mailSentAndSummary } from "src/util/mailSummary";
import { prisma } from "src/prisma";
import { StorageController } from "./storage.controller";

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

      const form = await c.req.formData();

      // helpers
      const getStr = (key: string) => {
        const v = form.get(key);
        return typeof v === "string" ? v.trim() : "";
      };
      const mustStr = (key: string, label?: string) => {
        const v = getStr(key);
        if (!v) throw new Error(`${label ?? key} is required`);
        return v;
      };

      // ---- fields from form-data ----
      const announcementId = mustStr("announcementId", "announcementId");
      if (!isValidUUID(announcementId)) {
        return c.json({ error: "announcementId must be a valid UUID" }, 400);
      }

      const name = mustStr("name", "name");
      const description = getStr("description") ?? "";
      const scheduleStr = getStr("schedule");
      const schedule = new Date(scheduleStr);
      if (isNaN(schedule.getTime())) {
        return c.json({ error: "schedule must be a valid ISO datetime" }, 400);
      }

      // ---- find related course ----
      const courseRow = await AnnouncementModel.getCourseIdByAnnouncementId(
        announcementId
      );
      if (!courseRow) {
        return c.json(
          { message: "Course not found for this announcement" },
          404
        );
      }
      const courseId = courseRow.courseId;

      // ---- update main announcement ----
      const updated = await AnnouncementModel.updateAnnouncement(
        announcementId,
        name,
        description,
        schedule
      );
      if (!updated) {
        return c.json({ message: "Announcement not found" }, 404);
      }

      // ---- FILE HANDLING ----
      const uploadedFiles: { name: string; filepath: string }[] = [];
      const newFiles = form
        .getAll("files")
        .filter((f) => f instanceof File) as File[];

      for (const file of newFiles) {
        const url = await StorageController.uploadCourseFileCore({
          courseId,
          announcementId,
          file,
        });

        const newRecord = await prisma.file.create({
          data: {
            name: file.name,
            filepath: url,
            createdById: c.get("userId"),
            courseId,
            announcementId,
          },
        });

        uploadedFiles.push({ name: file.name, filepath: newRecord.filepath });
      }

      const existingFiles = await prisma.file.findMany({
        where: { announcementId },
        select: { id: true, filepath: true },
      });

      const keepUrlsRaw = form.get("keepUrls");
      let keepUrls: string[] = [];

      if (keepUrlsRaw) {
        try {
          const parsed = JSON.parse(keepUrlsRaw as string);
          if (Array.isArray(parsed)) {
            keepUrls = parsed.map((u) => String(u));
          }
        } catch {
          console.warn("Invalid keepUrls JSON");
        }
      }

      const finalKeptUrls = [
        ...keepUrls,
        ...uploadedFiles.map((f) => f.filepath),
      ];
      const toDelete = existingFiles.filter(
        (f) => !finalKeptUrls.includes(f.filepath)
      );

      if (toDelete.length) {
        await prisma.file.deleteMany({
          where: { id: { in: toDelete.map((f) => f.id) } },
        });
      }

      //mail
      // const mailUsers = await mailRoles.getAllUsersInCourse(courseId);
      const mailUsers = await mailRoles.test(courseId);
      const courseInfo = await mailRoles.coursename(courseId);
      if (courseInfo) {
        await mailSentAndSummary(mailUsers, async (u) => {
          const recipientName = u?.user?.name || u?.name || "User";
          return announcementMail.updateAnnouncementMail(
            courseInfo.name,
            updated,
            recipientName
          );
        });
      }

      return c.json(
        {
          message: "The announcement has been updated successfully",
          announcement: updated,
        },
        200
      );
    } catch (error: any) {
      console.error({
        context: "updateAnnouncement",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      const msg = typeof error?.message === "string" ? error.message : null;
      if (msg?.includes("required") || msg?.includes("valid")) {
        return c.json({ error: msg }, 400);
      }
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
