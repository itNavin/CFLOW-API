import type { Context } from "hono";
import FileModel from "../model/file.model";

export const FileController = {
  // POST /file/course/:courseId
  createFile: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "ADVISOR" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return c.json(
          { error: "Forbidden: ADVISOR, ADMIN or SUPER_ADMIN only" },
          403
        );
      }

      const userId = c.get("userId");
      if (!userId) return c.json({ error: "Unauthorized" }, 401);

      const courseId = Number(c.req.param("courseId"));
      if (!Number.isFinite(courseId) || courseId <= 0) {
        return c.json({ error: "Invalid courseId" }, 400);
      }

      const body = await c.req.json<any>();
      const name = String(body.name ?? "").trim();
      const filepath = String(body.filepath ?? "").trim();
      const announcementId =
        body.announcementId !== undefined && body.announcementId !== null
          ? Number(body.announcementId)
          : undefined;

      if (!name) return c.json({ error: "name is required" }, 400);
      if (!filepath) return c.json({ error: "filepath is required" }, 400);
      if (
        announcementId !== undefined &&
        (Number.isNaN(announcementId) || announcementId <= 0)
      ) {
        return c.json(
          { error: "announcementId must be a positive number" },
          400
        );
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
        announcementIdParam !== null ? Number(announcementIdParam) : undefined;

      const unattached = unattachedParam
        ? unattachedParam.toLowerCase() === "true"
        : undefined;

      const createdById =
        createdByIdParam !== null
          ? Number(createdByIdParam)
          : uploadedByIdParam !== null
          ? Number(uploadedByIdParam)
          : undefined;

      const courseId =
        courseIdParam !== null ? Number(courseIdParam) : undefined;

      const order = orderParam === "desc" ? "desc" : "asc";

      const files = await FileModel.getAllFiles({
        announcementId:
          typeof announcementId === "number" && !Number.isNaN(announcementId)
            ? announcementId
            : undefined,
        unattached,
        createdById:
          typeof createdById === "number" && !Number.isNaN(createdById)
            ? createdById
            : undefined,
        courseId:
          typeof courseId === "number" && !Number.isNaN(courseId)
            ? courseId
            : undefined,
        order,
      });

      return c.json(files, 200);
    } catch (err) {
      console.error("Error fetching files:", err);
      return c.json({ error: "Failed to fetch files" }, 500);
    }
  },

  // GET /file/course/:courseId
  getFilesByCourseId: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      if (!Number.isFinite(courseId) || courseId <= 0) {
        return c.json({ error: "Invalid courseId" }, 400);
      }

      const url = new URL(c.req.url);
      const announcementIdParam = url.searchParams.get("announcementId");
      const unattachedParam = url.searchParams.get("unattached");

      const createdByIdParam = url.searchParams.get("createdById");
      const uploadedByIdParam = url.searchParams.get("uploadedById");

      const orderParam = url.searchParams.get("order");

      const announcementId =
        announcementIdParam !== null ? Number(announcementIdParam) : undefined;

      const unattached = unattachedParam
        ? unattachedParam.toLowerCase() === "true"
        : undefined;

      const createdById =
        createdByIdParam !== null
          ? Number(createdByIdParam)
          : uploadedByIdParam !== null
          ? Number(uploadedByIdParam)
          : undefined;

      const order = orderParam === "desc" ? "desc" : "asc";

      const files = await FileModel.getFilesByCourseId(courseId, {
        announcementId:
          typeof announcementId === "number" && !Number.isNaN(announcementId)
            ? announcementId
            : undefined,
        unattached,
        createdById:
          typeof createdById === "number" && !Number.isNaN(createdById)
            ? createdById
            : undefined,
        order,
      });

      return c.json(files, 200);
    } catch (err) {
      console.error("Error fetching files by course:", err);
      return c.json({ error: "Failed to fetch files by course" }, 500);
    }
  },
};
