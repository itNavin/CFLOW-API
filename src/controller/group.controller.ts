import { Context } from "hono";
import GroupModel from "../model/group.model";

const createGroupHandler = async (c: Context) => {
  try {
    const courseId = Number(c.req.param("courseId"));
    const body = await c.req.json();

    const newGroup = await GroupModel.createGroup({
      courseId,
      projectName: body.projectName,
      productName: body.productName ?? null,
      company: body.company ?? null,
      memberIds: (body.memberIds ?? []).map((m: any) => ({
        id: Number(m.id),
        workRole: m.workRole || "STUDENT",
      })),
      advisorIds: (body.advisorIds ?? []).map((id: any) => Number(id)),
      coAdvisorIds: (body.coAdvisorIds ?? []).map((id: any) => Number(id)),
    });

    return c.json(newGroup, 201);
  } catch (error) {
    console.error("Error creating group:", error);
    return c.json({ error: "Failed to create group" }, 500);
  }
};

const getAllGroupsHandler = async (c: Context) => {
  try {
    const courseId = Number(c.req.param("courseId"));
    const groups = await GroupModel.getAllGroups(courseId);
    return c.json(groups, 200);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return c.json({ error: "Failed to fetch groups" }, 500);
  }
};

export { createGroupHandler, getAllGroupsHandler };
