import type { Context } from "hono";
import SubmissionModel from "../model/submission.model";

export const SubmissionController = {
  createSubmission: async (c: Context) => {
    try {
      const assignmentId = Number(c.req.param("assignmentId"));
      const groupId = Number(c.req.param("groupId"));
      if (!Number.isFinite(assignmentId))
        return c.json({ error: "Invalid assignmentId" }, 400);
      if (!Number.isFinite(groupId))
        return c.json({ error: "Invalid groupId" }, 400);

      const body = await c.req.json();
      const comment = String(body?.comment ?? "").trim();
      if (!comment) return c.json({ error: "comment is required" }, 400);

      const filesRaw = Array.isArray(body?.files) ? body.files : [];
      const files: { deliverableId: number; fileUrls: string[] }[] =
        filesRaw.map((f: any) => ({
          deliverableId: Number(f?.deliverableId),
          fileUrls: Array.isArray(f?.fileUrls)
            ? f.fileUrls.map((u: any) => String(u ?? "").trim()).filter(Boolean)
            : [],
        }));

      // Require at least one file (change to allow empty if your business rules allow late/no-file)
      if (files.length === 0) {
        return c.json({ error: "files are required" }, 400);
      }
      if (files.some((f) => !Number.isFinite(f.deliverableId))) {
        return c.json(
          { error: "Each file must include a valid deliverableId" },
          400
        );
      }

      const created = await SubmissionModel.createSubmission({
        assignmentId,
        groupId,
        comment,
        files,
      });

      c.header("Location", `/submission/${created.id}`);
      return c.json(created, 201);
    } catch (err: any) {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : "Failed to create submission";
      if (msg.includes("already FINAL")) return c.json({ error: msg }, 409);
      if (msg.includes("No due date found")) return c.json({ error: msg }, 400);
      console.error("Error creating submission:", err);
      return c.json({ error: msg }, 400);
    }
  },
};
