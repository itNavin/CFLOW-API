import { Context } from "hono";

import GroupModel from "../model/group.model";

import { GroupPayload } from "../types/payload/group.type";
import { isValidUUID } from "../types/uuid";

export const GroupController = {
  createGroup: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: staff only" }, 403);
      }
      const body = await c.req.json<GroupPayload.createGroup>();

      const courseId = body.courseId;
      if (!courseId) {
        return c.json({ message: "courseId is required" }, 400);
      }
      if(!isValidUUID(courseId)) {
        return c.json({ error: "Invalid courseId (UUID expected)" }, 400);
      }

      if (!body?.projectName) {
        return c.json({ error: "projectName is required" }, 400);
      }

      const newGroup = await GroupModel.createGroup({
        courseId,
        codeNumber:
          typeof body.codeNumber === "string" && body.codeNumber.trim() !== ""
            ? body.codeNumber.trim()
            : null,
        projectName: body.projectName,
        productName: body.productName ?? null,
        company: body.company ?? null,
        memberIds: Array.isArray(body.memberIds)
          ? body.memberIds.map((m) => ({
              id: m.id,
              workRole: m.workRole,
            }))
          : [],
        advisorIds: Array.isArray(body.advisorIds)
          ? body.advisorIds.map((ad) => ad.id)
          : [],
        coAdvisorIds: Array.isArray(body.coAdvisorIds)
          ? body.coAdvisorIds.map((ad) => ad.id)
          : [],
      });

      return c.json(
        {
          message: "Group created successfully",
          group: newGroup,
        },
        201
      );
    } catch (error: any) {
      if (error?.status >= 400 && error?.status < 500) {
        return c.json({ error: error.message }, 400);
      }
      if (error?.code === "P2002") {
        return c.json({ error: "Duplicate codeNumber in this course" }, 409);
      }
      console.error({
        context: "createCourse",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  getAllGroups: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: staff only" }, 403);
      }

      const courseId = c.req.param("courseId");
      if (!courseId) {
        return c.json({ message: "courseId is required" }, 400);
      }
      if(!isValidUUID(courseId)) {
        return c.json({ error: "Invalid courseId (UUID expected)" }, 400);
      }

      const groups = await GroupModel.getAllGroups(courseId);
      return c.json(
        {
          message: "Groups retrieved successfully",
          groups: groups,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "createCourse",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
  getStudentNotInGroup: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: staff only" }, 403);
      }

      const courseId = c.req.param("courseId");
      if (!courseId) {
        return c.json({ message: "courseId is required" }, 400);
      }
      if(!isValidUUID(courseId)) {
        return c.json({ error: "Invalid courseId (UUID expected)" }, 400);
      }

      const students = await GroupModel.getStudentNoInGroup(courseId);
      return c.json(
        {
          message: "Students retrieved successfully",
          students: students,
        },
        200
      );
      
    } catch (error) {
      console.error({
        context: "getStudentNotInGroup",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  updateGroup: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: staff only" }, 403);
      }

      const body = await c.req.json<GroupPayload.updateGroup>();

      const courseId = String(body.courseId ?? "").trim();
      if(!isValidUUID(courseId)) {
        return c.json({ error: "Invalid courseId (UUID expected)" }, 400);
      }

      const groupId = String(body.groupId ?? "").trim();
      if(!isValidUUID(groupId)) {
        return c.json({ error: "Invalid groupId (UUID expected)" }, 400);
      }

      const payload = {
        codeNumber:
          body.codeNumber === null
            ? null
            : typeof body.codeNumber === "string"
            ? body.codeNumber.trim()
            : undefined,

        projectName:
          typeof body.projectName === "string"
            ? body.projectName.trim()
            : undefined,

        productName:
          body.productName === null
            ? null
            : typeof body.productName === "string" && body.productName.trim()
            ? body.productName.trim()
            : undefined,

        company:
          body.company === null
            ? null
            : typeof body.company === "string" && body.company.trim()
            ? body.company.trim()
            : undefined,

        memberIds: Array.isArray(body.memberIds)
          ? body.memberIds
              .map((m) => ({
                id: String(m.id ?? "").trim(),
                workRole: String(m.workRole ?? "").trim() || "STUDENT",
              }))
              .filter((m) => isValidUUID(m.id))
          : undefined,

        advisorIds: Array.isArray(body.advisorIds)
          ? body.advisorIds
              .map((a) => String(a.id ?? "").trim())
              .filter((id) => isValidUUID(id))
          : undefined,

        coAdvisorIds: Array.isArray(body.coAdvisorIds)
          ? body.coAdvisorIds
              .map((a) => String(a.id ?? "").trim())
              .filter((id) => isValidUUID(id))
          : undefined,
      } as const;

      const updated = await GroupModel.updateGroup(groupId, courseId, payload);
      return c.json(
        {
          message: "Group updated successfully",
          group: updated,
        },
        200
      );
    } catch (error: any) {
      if (error?.status === 404) return c.json({ error: error.message }, 404);
      if (error?.status === 400) return c.json({ error: error.message }, 400);
      if (error?.code === "P2002") {
        return c.json({ error: "Duplicate codeNumber in this course" }, 409);
      }
      console.error({
        context: "createCourse",
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
