import type { Context } from "hono";
import { prisma } from "../prisma";
import AssignmentModel from "../model/assignment.model";
import { AssignmentPayload } from "src/types/payload/assignment.types";
import { isValidUUID } from "../types/uuid";
import { assignmentMail } from "src/mail/assignment.mail";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";

export const AssignmentController = {
  getGroupByLecturerId: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role != "lecturer") {
        return c.json({ error: "Forbidden: lecturer only" }, 403);
      }

      const userId = c.get("userId");
      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const courseId = c.req.param("courseId");
      if (!courseId) {
        return c.json({ message: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "courseId must be a valid UUID" }, 400);
      }

      const groups = await AssignmentModel.getGroupsByLecturerId(
        userId,
        courseId
      );
      return c.json(
        {
          message: "Get lecturer's groups successfully",
          groups: groups,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "getGroupByLecturerId",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  createAssignment: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden: STAFF only" }, 403);
      }

      const body = await c.req.json<AssignmentPayload.CreateAssignment>();

      const courseId = body.courseId;
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const name = body.name.trim();
      if (!name) {
        return c.json({ error: "name is required" }, 400);
      }
      const description = body.description.trim();

      const endDateStr = body.endDate;
      if (!endDateStr) {
        return c.json({ error: "endDate is required" }, 400);
      }
      const scheduleStr = body.schedule;
      const schedule = new Date(scheduleStr);
      if (!schedule || isNaN(schedule.getTime())) {
        return c.json(
          { error: "schedule must be a valid ISO datetime string" },
          400
        );
      }
      const dueDateStr = body.dueDate;
      if (!dueDateStr) {
        return c.json({ error: "dueDate is required" }, 400);
      }

      const endDate = new Date(endDateStr);
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

      //mail
      //const mailUsers = await mailRoles.getAllUsersInCourse(courseId);
      const mailUsers = await mailRoles.test(courseId);
      const courseName = await mailRoles.coursename(courseId);
      if (!courseName) {
        return c.json({ error: "Course not found" }, 404);
      }
      const { subject, html, text } = await assignmentMail.createAssignmentMail(
        courseName.name,
        created
      );
      mailSentAndSummary(mailUsers, subject, html, text);

      return c.json(
        {
          message: "The assignment has been created successfully",
          assignment: created,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "createAssignment",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  updateAssignment: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden: STAFF only" }, 403);
      }

      const body = await c.req.json<AssignmentPayload.UpdateAssignment>();

      const assignmentId = body.assignmentId;
      if (!assignmentId) {
        return c.json({ error: "assignmentId is required" }, 400);
      }
      if (!isValidUUID(assignmentId)) {
        return c.json({ error: "assignmentId must be a valid UUID" }, 400);
      }

      const hasSubmission = await prisma.submission.findFirst({
        where: { assignmentId },
        select: { id: true },
      });
      if (hasSubmission) {
        return c.json(
          {
            error:
              "This assignment already has submissions and cannot be updated.",
          },
          409
        );
      }

      const name = (body.name ?? "").trim();
      if (!name) {
        return c.json({ error: "name is required" }, 400);
      }

      const description = (body.description ?? "").trim();

      const endDateStr = body.endDate;
      if (!endDateStr) {
        return c.json({ error: "endDate is required" }, 400);
      }
      const scheduleStr = body.schedule;
      if (!scheduleStr) {
        return c.json({ error: "schedule is required" }, 400);
      }
      const dueDateStr = body.dueDate;
      if (!dueDateStr) {
        return c.json({ error: "dueDate is required" }, 400);
      }

      const endDate = new Date(endDateStr);
      const schedule = new Date(scheduleStr);
      const dueDate = new Date(dueDateStr);

      if (isNaN(endDate.getTime())) {
        return c.json({ error: "endDate must be a valid ISO datetime" }, 400);
      }
      if (isNaN(schedule.getTime())) {
        return c.json({ error: "schedule must be a valid ISO datetime" }, 400);
      }
      if (isNaN(dueDate.getTime())) {
        return c.json({ error: "dueDate must be a valid ISO datetime" }, 400);
      }

      const deliverables = body.deliverables;

      const updated = await AssignmentModel.updateAssignment({
        assignmentId,
        name,
        description,
        endDate,
        schedule,
        dueDate,
        deliverables,
      });

      if (!updated) {
        return c.json({ error: "Assignment not found" }, 404);
      }

      // const mailUsers = await mailRoles.test(courseId); 
      // // const courseName = await mailRoles.coursename(courseId); 
      // // if (!courseName) { 
      // // return c.json({ error: "Course not found" }, 404); 
      // // } 
      // // const { subject, html, text } = 
      // // await assignmentMail.updateAssignmentMail(courseName.name, updated); 
      // // await mailSentAndSummary(mailUsers, subject, html, text);

      return c.json(
        {
          message: "The assignment has been updated successfully",
          assignment: updated,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "updateAssignment",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  deleteAssignment: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden: STAFF only" }, 403);
      }

      const body = await c.req.json<{ assignmentId: string }>();

      const assignmentId = body.assignmentId;
      if (!assignmentId) {
        return c.json({ error: "assignmentId is required" }, 400);
      }

      const deleted = await AssignmentModel.deleteAssignment(assignmentId);
      if (!deleted) {
        return c.json({ error: "Assignment not found" }, 404);
      }

      return c.json(
        {
          message: "The assignment has been deleted successfully",
          delete: deleted,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "deleteAssignment",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  getAllAssignmentsByCourseId: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff" && role !== "lecturer" && role !== "student") {
        return c.json(
          { error: "Forbidden: staff, lecturer, student only" },
          403
        );
      }
      const courseId = c.req.param("courseId");
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const rows = await AssignmentModel.getAllAssignments(courseId);
      return c.json(
        {
          message: "The assignments have been fetched successfully",
          assignments: rows,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "createAssignment",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  getAssignmentWithSubmissions: async (c: Context) => {
    try {
      const role = c.get("role");
      if (!["staff", "lecturer", "student"].includes(role)) {
        return c.json(
          { message: "Forbidden: staff, lecturer, student only" },
          403
        );
      }

      const courseId = c.req.param("courseId");
      if (!courseId) return c.json({ message: "courseId is required" }, 400);
      if (!isValidUUID(courseId)) {
        return c.json({ message: "courseId must be a valid UUID" }, 400);
      }

      const assignmentId = c.req.param("assignmentId");
      if (!assignmentId)
        return c.json({ message: "assignmentId is required" }, 400);
      if (!isValidUUID(assignmentId)) {
        return c.json({ message: "assignmentId must be a valid UUID" }, 400);
      }

      const userId = c.get("userId");
      if (!userId) return c.json({ message: "Unauthorized" }, 401);

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { courseId: true },
      });
      if (!assignment) return c.json({ message: "Assignment not found" }, 404);
      if (assignment.courseId !== courseId) {
        return c.json(
          { message: "Assignment does not belong to this course" },
          400
        );
      }

      const groupIdParam = c.req.param("groupId");

      let groupId: string;

      if (groupIdParam) {
        if (!isValidUUID(groupIdParam)) {
          return c.json({ message: "groupId must be a valid UUID" }, 400);
        }
        if (!["lecturer", "staff"].includes(role)) {
          return c.json(
            { message: "Forbidden: lecturer, staff only for this route" },
            403
          );
        }

        const group = await prisma.group.findFirst({
          where: { id: groupIdParam, courseId },
          select: { id: true },
        });
        if (!group)
          return c.json({ message: "Group not found in this course" }, 404);

        groupId = groupIdParam;
      } else {
        if (role !== "student") {
          return c.json(
            {
              message: "groupId path parameter is required for lecturer/staff",
            },
            400
          );
        }

        const cm = await prisma.courseMember.findUnique({
          where: { courseId_userId: { courseId, userId } },
          select: { id: true },
        });
        if (!cm) {
          return c.json(
            { message: "You are not a member of this course" },
            403
          );
        }

        const memberships = await prisma.groupMember.findMany({
          where: { courseMemberId: cm.id },
          select: { groupId: true },
          orderBy: { groupId: "asc" },
        });

        if (memberships.length === 0) {
          return c.json(
            { message: "You are not in any group for this course" },
            400
          );
        }
        if (memberships.length > 1) {
          return c.json(
            {
              message:
                "You belong to multiple groups in this course. Please contact staff to specify the group.",
              groupIds: memberships.map((m) => m.groupId),
            },
            409
          );
        }

        groupId = memberships[0].groupId;
      }

      const data = await AssignmentModel.getAssignmentWithSubmissions(
        assignmentId,
        groupId
      );
      if (!data) return c.json({ message: "Assignment not found" }, 404);

      return c.json(
        {
          message: "Assignment with submissions fetched successfully",
          assignment: data,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "getAssignmentWithSubmissions",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json({ message: "Failed to fetch assignment details" }, 500);
    }
  },

  getStudentAssignmentByGroupId: async (c: Context) => {
    try {
      const courseId = c.req.param("courseId");

      if (!courseId) return c.json({ message: "courseId is required" }, 400);
      if (!isValidUUID(courseId)) {
        return c.json({ message: "courseId must be a valid UUID" }, 400);
      }

      const userId = c.get("userId");
      if (!userId) return c.json({ message: "Unauthorized" }, 401);

      const cm = await prisma.courseMember.findUnique({
        where: { courseId_userId: { courseId, userId } },
        select: { id: true },
      });
      if (!cm) {
        return c.json({ message: "You are not a member of this course" }, 403);
      }

      const memberships = await prisma.groupMember.findMany({
        where: { courseMemberId: cm.id },
        select: { groupId: true },
        orderBy: { groupId: "asc" },
      });

      if (memberships.length === 0) {
        return c.json(
          {
            message: "Assignment fetched successfully",
            assignment: {
              courseId,
              groupId: null,
              counts: { open: 0, submitted: 0 },
              openTasks: [],
              submitted: [],
            },
          },
          200
        );
      }
      if (memberships.length > 1) {
        return c.json(
          {
            message:
              "You belong to multiple groups in this course. Please specify groupId explicitly.",
            groupIds: memberships.map((m) => m.groupId),
          },
          409
        );
      }

      const groupId = memberships[0].groupId;

      const data = await AssignmentModel.getStudentAssignmentByGroupId(
        courseId,
        groupId
      );

      return c.json(
        {
          message: "Assignment fetched successfully",
          assignment: data,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "getStudentAssignmentByGroupId",
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
