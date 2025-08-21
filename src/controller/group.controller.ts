import { Context } from "hono";
import GroupModel from "../model/group.model";

export const GroupController = {
  // POST /group/createGroup/:courseId
  createGroup: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      const body = await c.req.json();

      if (!courseId || Number.isNaN(courseId)) {
        return c.json({ error: "Invalid courseId" }, 400);
      }
      if (!body?.projectName) {
        return c.json({ error: "projectName is required" }, 400);
      }

      const newGroup = await GroupModel.createGroup({
        courseId,
        // admin-provided codeNumber (string like "0001") or null/omitted
        codeNumber:
          typeof body.codeNumber === "string" && body.codeNumber.trim() !== ""
            ? body.codeNumber.trim()
            : null,
        projectName: body.projectName,
        productName: body.productName ?? null,
        company: body.company ?? null,
        // members: [{ id, workRole }]
        memberIds: Array.isArray(body.memberIds)
          ? body.memberIds.map((m: any) => ({
              id: Number(m.id),
              workRole: String(m.workRole ?? "").trim() || "STUDENT",
            }))
          : [],
        // advisors: number[]
        advisorIds: Array.isArray(body.advisorIds)
          ? body.advisorIds.map((id: any) => Number(id))
          : [],
        // coAdvisors: number[]
        coAdvisorIds: Array.isArray(body.coAdvisorIds)
          ? body.coAdvisorIds.map((id: any) => Number(id))
          : [],
      });

      return c.json(newGroup, 201);
    } catch (error: any) {
      if (error?.status === 400) {
        return c.json({ error: error.message }, 400);
      }
      if (error?.code === "P2002") {
        return c.json({ error: "Duplicate codeNumber in this course" }, 409);
      }
      console.error("Error creating group:", error);
      return c.json({ error: "Failed to create group" }, 500);
    }
  },

  // GET /group/:courseId
  getAllGroups: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      if (!courseId || Number.isNaN(courseId)) {
        return c.json({ error: "Invalid courseId" }, 400);
      }
      const groups = await GroupModel.getAllGroups(courseId);
      return c.json(groups, 200);
    } catch (error) {
      console.error("Error fetching groups:", error);
      return c.json({ error: "Failed to fetch groups" }, 500);
    }
  },

  updateGroup: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      const groupId = Number(c.req.param("groupId"));

      if (!courseId || Number.isNaN(courseId)) {
        return c.json({ error: "Invalid courseId" }, 400);
      }
      if (!groupId || Number.isNaN(groupId)) {
        return c.json({ error: "Invalid groupId" }, 400);
      }

      const body = await c.req.json();

      const payload = {
        codeNumber:
          body.codeNumber === null
            ? null
            : typeof body.codeNumber === "string"
            ? body.codeNumber.trim()
            : undefined, // undefined = don't change

        projectName:
          typeof body.projectName === "string" ? body.projectName.trim() : undefined,

        productName:
          body.productName === null
            ? null
            : typeof body.productName === "string"
            ? body.productName.trim()
            : undefined,

        company:
          body.company === null
            ? null
            : typeof body.company === "string"
            ? body.company.trim()
            : undefined,

        memberIds: Array.isArray(body.memberIds)
          ? body.memberIds.map((m: any) => ({
              id: Number(m.id),
              workRole: String(m.workRole ?? "").trim() || "STUDENT",
            }))
          : undefined, // omit → no change

        advisorIds: Array.isArray(body.advisorIds)
          ? body.advisorIds.map((id: any) => Number(id))
          : undefined,

        coAdvisorIds: Array.isArray(body.coAdvisorIds)
          ? body.coAdvisorIds.map((id: any) => Number(id))
          : undefined,
      } as const;

      const updated = await GroupModel.updateGroup(groupId, courseId, payload);
      return c.json(updated, 200);
    } catch (error: any) {
      if (error?.status === 404) return c.json({ error: error.message }, 404);
      if (error?.status === 400) return c.json({ error: error.message }, 400);
      if (error?.code === "P2002") {
        return c.json({ error: "Duplicate codeNumber in this course" }, 409);
      }
      console.error("Error updating group:", error);
      return c.json({ error: "Failed to update group" }, 500);
    }
  },

};


