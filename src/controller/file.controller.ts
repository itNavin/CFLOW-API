import { Context } from "hono";
import FileModel from "../model/file.model";
import { FilePayload } from "../types/payload/file.type";

export const FileController = {
  // POST /file/
  createFile: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "ADVISOR || ADMIN || SUPER_ADMIN") {
        return c.json({ error: "Forbidden: ADVISOR & ADMIN only" }, 403);
      }

      const body = await c.req.json<FilePayload.createFile>();

      const name = body.name;
      const filepath = body.filepath;
      const uploadById = body.uploadById;

      if (!name) return c.json({ error: "name is required" }, 400);
      if (!filepath) return c.json({ error: "filepath is required" }, 400);
      if (!uploadById || Number.isNaN(uploadById)) {
        return c.json(
          { error: "uploadById is required and must be a number" },
          400
        );
      }

      const file = await FileModel.createFile({ name, filepath, uploadById });
      return c.json(file, 201);
    } catch (err: any) {
      if (err?.status === 404) return c.json({ error: err.message }, 404);
      console.error("Error creating file:", err);
      return c.json({ error: "Failed to create file" }, 500);
    }
  },

  // GET /file/
  getAllFiles: async (c: Context) => {
    try {
      const url = new URL(c.req.url);

      const announcementIdParam = url.searchParams.get("announcementId");
      const unattachedParam = url.searchParams.get("unattached");
      const uploadedByIdParam = url.searchParams.get("uploadedById");
      const orderParam = url.searchParams.get("order");

      const announcementId =
        announcementIdParam !== null ? Number(announcementIdParam) : undefined;

      const unattached = unattachedParam
        ? unattachedParam.toLowerCase() === "true"
        : undefined;

      const uploadedById =
        uploadedByIdParam !== null ? Number(uploadedByIdParam) : undefined;

      const order = orderParam === "desc" ? "desc" : "asc";

      const files = await FileModel.getAllFiles({
        announcementId:
          typeof announcementId === "number" && !Number.isNaN(announcementId)
            ? announcementId
            : undefined,
        unattached,
        uploadedById:
          typeof uploadedById === "number" && !Number.isNaN(uploadedById)
            ? uploadedById
            : undefined,
        order,
      });

      return c.json(files, 200);
    } catch (err) {
      console.error("Error fetching files:", err);
      return c.json({ error: "Failed to fetch files" }, 500);
    }
  },
};
