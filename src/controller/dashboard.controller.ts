import type { Context } from "hono";
import DashboardModel from "../model/dashboard.model";

function parseAsOf(c: Context): Date | undefined {
  const s = c.req.query("asOf");
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export const DashboardController = {
  // GET /dashboard/course/:courseId
  getCourseSummary: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      if (Number.isNaN(courseId)) {
        return c.json({ message: "Invalid courseId" }, 400);
      }
      const asOf = parseAsOf(c);
      const summary = await DashboardModel.getCourseSummary(courseId, asOf);
      if (!summary) return c.json({ message: "Course not found" }, 404);
      return c.json(summary, 200);
    } catch (err) {
      console.error("Error fetching dashboard summary:", err);
      return c.json({ message: "Internal server error" }, 500);
    }
  },

  // GET /dashboard/course/:courseId/assignment/:assignmentId
  getCourseSummaryByAssignment: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      const assignmentId = Number(c.req.param("assignmentId"));
      if (Number.isNaN(courseId) || Number.isNaN(assignmentId)) {
        return c.json({ message: "Invalid courseId or assignmentId" }, 400);
      }
      const asOf = parseAsOf(c);
      const summary = await DashboardModel.getCourseSummaryFiltered(courseId, {
        assignmentId,
        asOf,
      });
      if (!summary) return c.json({ message: "Course not found" }, 404);
      return c.json(summary, 200);
    } catch (err) {
      console.error("Error fetching dashboard summary by assignment:", err);
      return c.json({ message: "Internal server error" }, 500);
    }
  },

  // GET /dashboard/course/:courseId/group/:groupId
  getCourseSummaryByGroup: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      const groupId = Number(c.req.param("groupId"));
      if (Number.isNaN(courseId) || Number.isNaN(groupId)) {
        return c.json({ message: "Invalid courseId or groupId" }, 400);
      }
      const asOf = parseAsOf(c);
      const summary = await DashboardModel.getCourseSummaryFiltered(courseId, {
        groupId,
        asOf,
      });
      if (!summary) return c.json({ message: "Course not found" }, 404);
      return c.json(summary, 200);
    } catch (err) {
      console.error("Error fetching dashboard summary by group:", err);
      return c.json({ message: "Internal server error" }, 500);
    }
  },

  // GET /dashboard/course/:courseId/assignment/:assignmentId/group/:groupId
  getCourseSummaryByAssignmentAndGroup: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      const assignmentId = Number(c.req.param("assignmentId"));
      const groupId = Number(c.req.param("groupId"));
      if (
        Number.isNaN(courseId) ||
        Number.isNaN(assignmentId) ||
        Number.isNaN(groupId)
      ) {
        return c.json({ message: "Invalid params" }, 400);
      }
      const asOf = parseAsOf(c);
      const summary = await DashboardModel.getCourseSummaryFiltered(courseId, {
        assignmentId,
        groupId,
        asOf,
      });
      if (!summary) return c.json({ message: "Course not found" }, 404);
      return c.json(summary, 200);
    } catch (err) {
      console.error(
        "Error fetching dashboard summary by assignment/group:",
        err
      );
      return c.json({ message: "Internal server error" }, 500);
    }
  },
};
