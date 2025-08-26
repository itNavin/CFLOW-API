// src/controller/filename.controller.ts
import type { Context } from "hono";
import FilenameModel from "../model/filename.model";

export const FilenameController = {
  // POST /filename/change
  changeFileName: async (c: Context) => {
    try {
      const body = await c.req.json();

      const groupCode = String(body?.groupCode ?? "").trim();
      const deliverableName = String(body?.deliverableName ?? "").trim();
      const version = Number(body?.version);
      const originalName = body?.originalName
        ? String(body.originalName)
        : undefined;
      const mime = body?.mime ? String(body.mime) : undefined;
      const partIndex =
        body?.partIndex != null ? Number(body.partIndex) : undefined;

      // optional extras (if your model supports them):
      const deliverableId =
        body?.deliverableId != null ? Number(body.deliverableId) : undefined;
      const courseId =
        body?.courseId != null ? Number(body.courseId) : undefined;
      const assignmentId =
        body?.assignmentId != null ? Number(body.assignmentId) : undefined;

      if (!groupCode) return c.json({ error: "groupCode is required" }, 400);
      if (!deliverableName)
        return c.json({ error: "deliverableName is required" }, 400);
      if (!Number.isFinite(version) || version <= 0) {
        return c.json({ error: "version must be a positive number" }, 400);
      }
      if (partIndex != null && (!Number.isFinite(partIndex) || partIndex < 1)) {
        return c.json(
          { error: "partIndex must be a positive integer if provided" },
          400
        );
      }

      // 🔑 FIX: await the model
      const result = await FilenameModel.changeFileName({
        groupCode,
        deliverableName,
        version,
        originalName,
        mime,
        partIndex,
        deliverableId, // optional: validate mime allowed for this deliverable
        courseId, // optional: to build full storage key
        assignmentId, // optional: to build full storage key
      });

      return c.json(result, 200);
    } catch (err: any) {
      console.error("changeFileName error:", err);
      // surface useful error messages (e.g., unsupported MIME)
      return c.json(
        { error: err?.message ?? "Failed to generate filename" },
        400
      );
    }
  },
};
