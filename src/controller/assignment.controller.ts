import type { Context } from "hono";
import { prisma } from "../prisma";
import AssignmentModel from "../model/assignment.model";
import { AssignmentPayload } from "src/types/payload/assignment.types";
import { log } from "console";

export const AssignmentController = {
  getGroupByLecturerId: async (c: Context) => {
    try {
      const role = c.get("role");
      const userId = c.get("userId");
      const courseId = Number(c.req.param("courseId"));
      console.log("userId", userId);
      console.log("courseId", courseId);

      const groups = await AssignmentModel.getGroupsByLecturerId(
        userId,
        courseId
      );
      return c.json(groups, 200);
    } catch (e) {
      return c.json({ error: "Failed to fetch groups" }, 500);
    }
  },

  // POST /assignment/create/:courseId
  createAssignment: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden: STAFF only" }, 403);
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
      const courseId = Number(c.req.param("courseId"));
      const assignmentId = Number(c.req.param("assignmentId"));
      const role = String(c.get("role") ?? "");
      const userId = String(c.get("userId") ?? "");
      console.log("courseId", courseId);
      console.log("assignmentId", assignmentId);
      console.log("role", role);
      console.log("userId", userId);


      if (!Number.isFinite(courseId)) {
        return c.json({ error: "Invalid courseId" }, 400);
      }
      if (!Number.isFinite(assignmentId)) {
        return c.json({ error: "Invalid assignmentId" }, 400);
      }

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { courseId: true },
      });
      if (!assignment) return c.json({ error: "Assignment not found" }, 404);
      if (assignment.courseId !== courseId) {
        return c.json(
          { error: "Assignment does not belong to this course" },
          400
        );
      }

      let groupId: number | undefined;

      if (role === "student") {
        console.log("get in student block");
        
        if (!userId) return c.json({ error: "Unauthorized" }, 401);

        const cm = await prisma.courseMember.findUnique({
          where: { courseId_userId: { courseId, userId } },
          select: { id: true },
        });
        if (!cm) {
          return c.json({ error: "You are not a member of this course" }, 403);
        }

        const memberships = await prisma.groupMember.findMany({
          where: { courseMemberId: cm.id },
          select: { groupId: true },
          orderBy: { groupId: "asc" },
        });

        if (memberships.length === 0) {
          return c.json(
            { error: "You are not in any group for this course" },
            400
          );
        }
        if (memberships.length > 1) {
          return c.json(
            {
              error:
                "You belong to multiple groups in this course. Please specify groupId as a query parameter.",
              groupIds: memberships.map((m) => m.groupId),
            },
            409
          );
        }
        groupId = memberships[0].groupId;
      } else if (
        role === "lecturer" ||
        role === "staff" ||
        role === "SUPER_ADMIN"
      ) {
        console.log("get in lecturer, staff block");
        const gidParam = c.req.query("groupId");
        const gid = gidParam != null ? Number(gidParam) : NaN;
        if (!Number.isFinite(gid)) {
          return c.json(
            {
              error: "groupId query parameter is required and must be a number",
            },
            400
          );
        }

        const group = await prisma.group.findFirst({
          where: { id: gid, courseId },
          select: { id: true },
        });
        if (!group) {
          return c.json({ error: "Group not found in this course" }, 404);
        }
        groupId = gid;
      } else {
        return c.json({ error: "Forbidden" }, 403);
      }

      const data = await AssignmentModel.getAssignmentWithSubmissions(
        assignmentId,
        groupId!
      );
      if (!data) return c.json({ error: "Assignment not found" }, 404);

      return c.json(data, 200);
    } catch (err) {
      console.error("Error fetching assignment details:", err);
      return c.json({ error: "Failed to fetch assignment details" }, 500);
    }
  },

  getAssignmentsByGroup: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      const groupId = Number(c.req.param("groupId"));

      if (!Number.isFinite(courseId)) {
        return c.json({ error: "Invalid courseId" }, 400);
      }
      if (!Number.isFinite(groupId)) {
        return c.json({ error: "Invalid groupId" }, 400);
      }

      const data = await AssignmentModel.getAssignmentsForGroup(
        courseId,
        groupId
      );
      return c.json(data, 200);
    } catch (err) {
      console.error("Error fetching assignments by group:", err);
      return c.json({ error: "Failed to fetch assignments" }, 500);
    }
  },
};
