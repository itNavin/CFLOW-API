import { Context } from "hono";
import DashboardModel from "../model/dashboard.model";

export const DashboardController = {
  getCourseSummary: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      if (Number.isNaN(courseId)) {
        return c.json({ message: "Invalid courseId" }, 400);
      }

      const summary = await DashboardModel.getCourseSummary(courseId);
      if (!summary) {
        return c.json({ message: "Course not found" }, 404);
      }

      return c.json(summary, 200);
    } catch (err) {
      console.error("Error fetching dashboard summary:", err);
      return c.json({ message: "Internal server error" }, 500);
    }
  },
};
