import type { Context } from "hono";
import DashboardModel from "../model/dashboard.model";
import { isValidUUID } from "src/types/uuid";

function parseAsOf(c: Context): Date | undefined {
  const s = c.req.query("asOf");
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function readOptionalId(
  c: Context,
  name: string
): number | undefined | "INVALID" {
  const p = c.req.param(name);
  if (p !== undefined) {
    const n = Number(p);
    return Number.isFinite(n) ? n : "INVALID";
  }
  const q = c.req.query(name);
  if (q == null || q === "") return undefined;
  const n = Number(q);
  return Number.isFinite(n) ? n : "INVALID";
}

export const DashboardController = {
  getGroupInformationDashboard: async (c: Context) => {
    try {
      const userId = c.get("userId");
      console.log("userId", userId);
      
      const role = c.get("role");
      const courseId = c.req.param("courseId");
      if (role === "student") {
        const groupInformation = await DashboardModel.getGroupInformation(
          userId,
          courseId
        );
        return c.json(groupInformation, 200);
      } else {
        const groupInformation = await DashboardModel.getGroupInformationforAdvisor(
          userId,
          courseId
        );
        return c.json(groupInformation, 200);
      }
    } catch (e) {
      return c.json({ error: "Failed to fetch groups", e }, 500);
    }
  },

  getCourseSummaryUnified: async (c: Context) => {
    try {
      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const courseId = c.req.param("courseId");
      if (!courseId) {
        return c.json({ message: "Invalid courseId" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId format" }, 400);
      }



      const assignmentId = readOptionalId(c, "assignmentId");
      console.log("assignmentId", assignmentId);
      if (assignmentId === "INVALID") {
        return c.json({ message: "Invalid assignmentId" }, 400);
      }

      const groupId = readOptionalId(c, "groupId");
      console.log("groupId", groupId);
      if (groupId === "INVALID") {
        return c.json({ message: "Invalid groupId" }, 400);
      }

      const asOf = parseAsOf(c);

      const hasFilters =
        typeof assignmentId === "number" || typeof groupId === "number";

      const summary = hasFilters
        ? await DashboardModel.getCourseSummaryFiltered(courseId, {
            assignmentId: assignmentId as string | undefined,
            groupId: groupId as string | undefined,
            asOf,
          })
        : await DashboardModel.getCourseSummary(courseId, asOf);

      if (!summary) return c.json({ message: "Course not found" }, 404);
      return c.json(summary, 200);
    } catch (err) {
      console.error("Error fetching dashboard summary:", err);
      return c.json({ message: "Internal server error" }, 500);
    }
  },
};
