import type { Context } from "hono";
import DashboardModel from "../model/dashboard.model";
import { isValidUUID } from "src/types/uuid";

function parseAsOf(c: Context): Date | undefined {
  const s = c.req.query("asOf");
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function readOptionalUUID(
  c: Context,
  name: string
): string | undefined | "INVALID" {
  const q = c.req.query(name);
  if (q == null || q === "") return undefined;
  return isValidUUID(q) ? q : "INVALID";
}

export const DashboardController = {
  getGroupInformationDashboard: async (c: Context) => {
    try {
      const userId = c.get("userId");

      const role = c.get("role");
      const courseId = c.req.param("courseId");
      if (role === "student") {
        const groupInformation = await DashboardModel.getGroupInformation(
          userId,
          courseId
        );
        if (groupInformation.length === 0) {
          return c.json(
            {
              message: "No group found for this student in the specified course.",
              id: "none",
              codeNumber: "none",
              projectName: "none",
              productName: "none",
              company: "none",
              member: [],
              advisors: [],
            },
            200
          );
        }
        return c.json(
          {
            message: "The group information has been fetched successfully",
            groupInformation: groupInformation,
          },
          200
        );
      } else {
        const groupInformation =
          await DashboardModel.getGroupInformationforAdvisor(userId, courseId);
        return c.json(
          {
            message: "The group information has been fetched successfully",
            groupInformation: groupInformation,
          },
          200
        );
      }
    } catch (error) {
      console.error({
        context: "getGroupInformationDashboard",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  getCourseSummaryUnified: async (c: Context) => {
    try {
      const userId = c.get("userId");
      if (!userId) return c.json({ message: "Unauthorized" }, 401);

      const courseId = c.req.param("courseId");
      if (!courseId || !isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId" }, 400);
      }

      const assignmentId = readOptionalUUID(c, "assignmentId");
      if (assignmentId === "INVALID") {
        return c.json({ message: "Invalid assignmentId (UUID expected)" }, 400);
      }

      const groupId = readOptionalUUID(c, "groupId");
      if (groupId === "INVALID") {
        return c.json({ message: "Invalid groupId (UUID expected)" }, 400);
      }

      const asOf = parseAsOf(c);

      const hasFilters =
        typeof assignmentId === "string" || typeof groupId === "string";

      const summary = hasFilters
        ? await DashboardModel.getCourseSummaryFiltered(courseId, {
            assignmentId: assignmentId as string | undefined,
            groupId: groupId as string | undefined,
            asOf,
          })
        : await DashboardModel.getCourseSummary(courseId, asOf);

      if (!summary) return c.json({ message: "Course not found" }, 404);

      return c.json({ message: "Success", course: summary }, 200);
    } catch (error) {
      console.error({
        context: "getCourseSummaryUnified",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
};
