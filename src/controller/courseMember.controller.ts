import { Context } from "hono";
import { prisma } from "../prisma";
import {
  getAllCourseMembers,
  getAdvisorMembers,
  getStudentMembers,
} from "../model/courseMember.model";
import { addMember } from "../model/courseMember.model";

export const CourseMemberController = {
  getAllCourseMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    const members = await getAllCourseMembers(courseId);
    return c.json(members);
  },

  getAdvisorMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    const advisors = await getAdvisorMembers(courseId);
    return c.json(advisors);
  },

  getStudentMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    const students = await getStudentMembers(courseId);
    return c.json(students);
  },

  addMember: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    let body: { userId?: number };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ message: "Invalid JSON body" }, 400);
    }

    const userId = Number(body.userId);
    if (!courseId || !userId) {
      return c.json(
        { message: "courseId param and userId in body are required" },
        400
      );
    }

    // Validate course & user exist
    const [course, user] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    ]);

    if (!course) return c.json({ message: "Course not found" }, 404);
    if (!user) return c.json({ message: "User not found" }, 404);

    try {
      const created = await addMember(courseId, userId);
      return c.json(created, 201);
    } catch (e: any) {

      if (e?.code === "P2002") {
        return c.json(
          { message: "User is already a member of this course" },
          409
        );
      }
      return c.json(
        { message: "Failed to add member", error: String(e?.message ?? e) },
        500
      );
    }
  },
};
