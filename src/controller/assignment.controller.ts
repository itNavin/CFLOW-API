import type { Context } from "hono";
import AssignmentModel from "../model/assignment.model";
import { AssignmentPayload } from "src/types/payload/assignment.types";

export const AssignmentController = {
  // POST /assignment/create/:courseId
  createAssignment: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "ADVISOR || ADMIN || SUPER_ADMIN") {
        return c.json({ error: "Forbidden: ADVISOR and ADMIN only" }, 403);
      }

      const courseId = Number(c.req.param("courseId"));
      if (!courseId || Number.isNaN(courseId)) {
        return c.json({ error: "Invalid courseId" }, 400);
      }

      const body = await c.req.json<AssignmentPayload.CreateAssignment>();

      const name = body.name.trim();
      const description = body.description.trim();
      const endDateStr = body.endDate;
      const scheduleStr = body.schedule;
      const dueDateStr = body.dueDate;

      if (!name) return c.json({ error: "name is required" }, 400);
      if (!description)
        return c.json({ error: "description is required" }, 400);
      if (!endDateStr) return c.json({ error: "endDate is required" }, 400);
      if (!scheduleStr) return c.json({ error: "schedule is required" }, 400);
      if (!dueDateStr) return c.json({ error: "dueDate is required" }, 400);

      const endDate = new Date(endDateStr);
      const schedule = new Date(scheduleStr);
      const dueDate = new Date(dueDateStr);

      if (isNaN(endDate.getTime()))
        return c.json({ error: "endDate must be a valid ISO datetime" }, 400);
      if (isNaN(schedule.getTime()))
        return c.json({ error: "schedule must be a valid ISO datetime" }, 400);
      if (isNaN(dueDate.getTime()))
        return c.json({ error: "dueDate must be a valid ISO datetime" }, 400);

      const deliverables = body.deliverables;

      const created = await AssignmentModel.createAssignment({
        courseId,
        name,
        description,
        endDate,
        schedule,
        dueDate,
        deliverables,
      });

      return c.json(created, 201);
    } catch (err) {
      console.error("Error creating assignment:", err);
      return c.json({ error: "Failed to create assignment" }, 500);
    }
  },

  // GET /assignment/course/:courseId
  getAllAssignments: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      if (!courseId || Number.isNaN(courseId)) {
        return c.json({ error: "Invalid courseId" }, 400);
      }

      const rows = await AssignmentModel.getAllAssignments(courseId);
      return c.json(rows, 200);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      return c.json({ error: "Failed to fetch assignments" }, 500);
    }
  },

  // GET /assignment/:assignmentId/group/:groupId
  getAssignmentWithSubmissions: async (c: Context) => {
    try {
      const assignmentId = Number(c.req.param("assignmentId"));
      const groupId = Number(c.req.param("groupId"));

      if (!assignmentId || Number.isNaN(assignmentId)) {
        return c.json({ error: "Invalid assignmentId" }, 400);
      }
      if (!groupId || Number.isNaN(groupId)) {
        return c.json({ error: "Invalid groupId" }, 400);
      }

      const data = await AssignmentModel.getAssignmentWithSubmissions(
        assignmentId,
        groupId
      );
      if (!data) return c.json({ error: "Assignment not found" }, 404);

      return c.json(data, 200);
    } catch (err) {
      console.error("Error fetching assignment details:", err);
      return c.json({ error: "Failed to fetch assignment details" }, 500);
    }
  },
};
