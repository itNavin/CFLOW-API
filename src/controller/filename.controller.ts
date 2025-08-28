import type { Context } from "hono";
import FilenameModel from "../model/filename.model";
import { FilenamePayload } from "../types/payload/filename.type";

export const FilenameController = {
  // POST /filename/change
  changeFileName: async (c: Context) => {
    try {
      const body = await c.req.json<FilenamePayload.FilePayload>();

      const groupCode = body.groupCode.trim();
      const deliverableName = body.deliverableName.trim();
      const version = body.version;
      const originalName = body.originalName;
      const mime = body.mime;
      const partIndex = body.partIndex;
      const deliverableId = body.deliverableId;
      const courseId = body.courseId;
      const assignmentId = body.assignmentId;

      //validations
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

      const result = await FilenameModel.changeFileName({
        groupCode,
        deliverableName,
        version,
        originalName,
        mime,
        partIndex,
        deliverableId, 
        courseId,
        assignmentId,
      });

      return c.json(result, 200);
    } catch (err: any) {
      console.error("changeFileName error:", err);
      //(e.g., unsupported MIME)
      return c.json(
        { error: err?.message ?? "Failed to generate filename" },
        400
      );
    }
  },
};
