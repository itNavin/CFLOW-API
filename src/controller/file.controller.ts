import type { Context } from "hono";
import FileModel from "../model/file.model";
import { isValidUUID } from "src/types/uuid";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";

export const FileController = {
  deleteFile: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "lecturer" && role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json(
          { error: "Forbidden: ADVISOR, ADMIN or SUPER_ADMIN only" },
          403
        );
      }

      const body = await c.req.json<{ fileId: string }>();
      const fileId = body.fileId;
      if (!fileId || !isValidUUID(fileId)) {
        return c.json(
          { error: "fileId is required and must be a valid UUID" },
          400
        );
      }
      const deletedFile = await FileModel.deleteFile(fileId);
      return c.json(
        { message: "File deleted successfully", file: deletedFile },
        200
      );
    } catch (error: any) {
      console.error({
        context: "deleteFile",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  createFile: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "lecturer" && role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json(
          { error: "Forbidden: LECTURER, STAFF or SUPER_ADMIN only" },
          403
        );
      }

      const userId = c.get("userId");
      if (!userId) return c.json({ error: "Unauthorized" }, 401);

      const body = await c.req.json<any>();
      const courseId = body.courseId;
      const name = String(body.name ?? "").trim();
      const filepath = String(body.filepath ?? "").trim();
      const announcementId =
        body.announcementId !== undefined && body.announcementId !== null
          ? String(body.announcementId)
          : undefined;

      if (!name) return c.json({ error: "name is required" }, 400);
      if (!filepath) return c.json({ error: "filepath is required" }, 400);
      if (announcementId !== undefined) {
        return c.json({ error: "announcementId must be a valid UUID" }, 400);
      }

      const file = await FileModel.createFile({
        name,
        filepath,
        createdById: userId,
        courseId,
        announcementId,
      });

      return c.json(file, 201);
    } catch (err: any) {
      if (err?.status === 400 || err?.status === 404) {
        return c.json({ error: err.message }, err.status);
      }
      console.error("Error creating file:", err);
      return c.json({ error: "Failed to create file" }, 500);
    }
  },

  getAllFiles: async (c: Context) => {
    try {
      const url = new URL(c.req.url);

      const announcementIdParam = url.searchParams.get("announcementId");
      const unattachedParam = url.searchParams.get("unattached");

      const createdByIdParam = url.searchParams.get("createdById");
      const uploadedByIdParam = url.searchParams.get("uploadedById"); 

      const courseIdParam = url.searchParams.get("courseId"); 
      const orderParam = url.searchParams.get("order"); 

      const announcementId =
        announcementIdParam && announcementIdParam.trim() !== ""
          ? announcementIdParam.trim()
          : undefined;

      const unattached = unattachedParam
        ? unattachedParam.toLowerCase() === "true"
        : undefined;

      const createdById =
        createdByIdParam && createdByIdParam.trim() !== ""
          ? createdByIdParam.trim()
          : uploadedByIdParam && uploadedByIdParam.trim() !== ""
          ? uploadedByIdParam.trim()
          : undefined;

      const courseId =
        courseIdParam && courseIdParam.trim() !== ""
          ? courseIdParam.trim()
          : undefined;

      const order = orderParam === "desc" ? "desc" : "asc";

      if (courseId && !isValidUUID(courseId)) {
        return c.json({ error: "Invalid courseId (UUID expected)" }, 400);
      }
      if (announcementId && !isValidUUID(announcementId)) {
        return c.json({ error: "Invalid announcementId (UUID expected)" }, 400);
      }
      if (createdById && !isValidUUID(createdById)) {
        return c.json({ error: "Invalid createdById (UUID expected)" }, 400);
      }

      const files = await FileModel.getAllFiles({
        announcementId,
        unattached,
        createdById,
        courseId,
        order,
      });

      return c.json(files, 200);
    } catch (err) {
      console.error("Error fetching files:", err);
      return c.json({ error: "Failed to fetch files" }, 500);
    }
  },

  getFilesByCourseId: async (c: Context) => {
    try {
      const courseId = c.req.param("courseId"); 
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "Invalid courseId (UUID expected)" }, 400);
      }

      const url = new URL(c.req.url);
      const announcementIdParam = url.searchParams.get("announcementId");
      const unattachedParam = url.searchParams.get("unattached");
      const createdByIdParam = url.searchParams.get("createdById");
      const uploadedByIdParam = url.searchParams.get("uploadedById");
      const orderParam = url.searchParams.get("order");

      const announcementId =
        announcementIdParam && announcementIdParam.trim() !== ""
          ? announcementIdParam.trim()
          : undefined;

      const unattached = unattachedParam
        ? unattachedParam.toLowerCase() === "true"
        : undefined;

      const createdById =
        createdByIdParam && createdByIdParam.trim() !== ""
          ? createdByIdParam.trim()
          : uploadedByIdParam && uploadedByIdParam.trim() !== ""
          ? uploadedByIdParam.trim()
          : undefined;

      const order: "asc" | "desc" = orderParam === "desc" ? "desc" : "asc";

      if (announcementId && !isValidUUID(announcementId)) {
        return c.json({ error: "Invalid announcementId (UUID expected)" }, 400);
      }
      if (createdById && !isValidUUID(createdById)) {
        return c.json({ error: "Invalid createdById (UUID expected)" }, 400);
      }

      const files = await FileModel.getFilesByCourseId(courseId, {
        announcementId,
        unattached,
        createdById,
        order,
      });

      return c.json(files, 200);
    } catch (err) {
      console.error("Error fetching files by course:", err);
      return c.json({ error: "Failed to fetch files by course" }, 500);
    }
  },
};
