import type { Context } from "hono";
import { prisma } from "../prisma";
import fs from "node:fs";
import path from "node:path";
import { enrollFromWorkbook } from "../model/excel.model";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";

export const ImportController = {
  uploadAndEnroll: async (c: Context) => {
    const role = c.get("role");
    if (role !== "staff")
      return c.json(
        { message: "Forbidden: only staff can import enrollments" },
        403
      );

    const form = await c.req.formData();
    const file = form.get("file") as File | null;
    if (!file) return c.json({ message: "file is required" }, 400);
    const courseId = form.get("courseId") as string | null;
    if (!courseId) return c.json({ message: "courseId is required" }, 400);

    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    //mail
    const staffMailUsers = await mailRoles.getStaffInCourse(courseId);
    const lecturerMailUsers = await mailRoles.getLecturersInCourse(courseId);

    try {
      const result = await enrollFromWorkbook(courseId, buf);
      return c.json({
        message: "upload successfully",
        result: result,
      });
    } catch (err: any) {
      console.error("Enroll import error:", err);
      return c.json({ message: err?.message ?? "Import failed" }, 400);
    }
  },
};
