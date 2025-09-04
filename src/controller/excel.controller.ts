import type { Context } from "hono";
import { prisma } from "../prisma";
import fs from "node:fs";
import path from "node:path";
import { enrollFromWorkbook } from "../model/excel.model";

export const ImportController = {
  downloadTemplate: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    if (!Number.isFinite(courseId)) return c.text("Invalid courseId", 400);

    const role = c.get("role");
    if (role !== "lecturer" && role !== "staff")
      return c.text("Forbidden: only lecturers and staff can download templates", 403);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { program: true, name: true, id: true },
    });
    if (!course) return c.text("Course not found", 404);

    const fileName =
      course.program === "CS"
        ? "C-flow CS template.xlsx"
        : "C-flow DSI template.xlsx";

    const filePath = path.join(
      process.cwd(),
      "src",
      "assets",
      "templates",
      fileName
    );
    if (!fs.existsSync(filePath))
      return c.text("Template not found on server", 500);

    c.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    c.header("Content-Disposition", `attachment; filename="${fileName}"`);
    const file = await fs.promises.readFile(filePath);
    return new Response(file);
  },

  uploadAndEnroll: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    if (!Number.isFinite(courseId))
      return c.json({ message: "Invalid courseId" }, 400);

    const role = c.get("role");
    if (role !== "staff")
      return c.json(
        { message: "Forbidden: only staff can import enrollments" },
        403
      );
    const form = await c.req.formData();
    const file = form.get("file") as File | null;
    if (!file) return c.json({ message: "file is required" }, 400);

    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    try {
      const result = await enrollFromWorkbook(courseId, buf);
      return c.json(result, 200);
    } catch (err: any) {
      console.error("Enroll import error:", err);
      return c.json({ message: err?.message ?? "Import failed" }, 400);
    }
  },
};
