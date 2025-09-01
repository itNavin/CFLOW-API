import { Context } from "hono";
import { prisma } from "../prisma";
import {
  getAllCourseMembers,
  getAdvisorMembers,
  getStudentMembers,
  deleteCourseMember as deleteCourseMemberModel,
  addMember as addMemberModel,
} from "../model/courseMember.model";

export const CourseMemberController = {
  // GET /courseMember/:courseId
  getAllCourseMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    if (!Number.isFinite(courseId)) {
      return c.json({ message: "Invalid courseId" }, 400);
    }
    const members = await getAllCourseMembers(courseId);
    return c.json(members);
  },

  // GET /courseMember/:courseId/advisors
  getAdvisorMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    if (!Number.isFinite(courseId)) {
      return c.json({ message: "Invalid courseId" }, 400);
    }
    const advisors = await getAdvisorMembers(courseId);
    return c.json(advisors);
  },

  // GET /courseMember/:courseId/students
  getStudentMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    if (!Number.isFinite(courseId)) {
      return c.json({ message: "Invalid courseId" }, 400);
    }
    const students = await getStudentMembers(courseId);
    return c.json(students);
  },

  deleteMember: async (c: Context) => {
  try {
    const role = c.get("role");
    if (role !== "ADMIN") {
      return c.json({ message: "Forbidden: ADMIN only" }, 403);
    }

    const courseMemberId = Number(c.req.param("courseMemberId"));
    if (!Number.isFinite(courseMemberId)) {
      return c.json({ message: "Invalid courseMemberId" }, 400);
    }

    const result = await deleteCourseMemberModel(courseMemberId);
    return c.json({ message: "Course member deleted", result }, 200);
  } catch (e: any) {
    const status = e?.status ?? 500;
    if (status === 404) {
      return c.json({ message: "Course member not found" }, 404);
    }
    if (status === 409) {
      // include which groups are blocking the delete
      return c.json(
        {
          message:
            "Cannot delete: member is linked to groups or activity logs",
          details: e?.details ?? null, // contains memberOfGroups / advisorOfGroups with names & codes
        },
        409
      );
    }
    return c.json(
      { message: "Failed to delete course member", error: String(e?.message ?? e) },
      500
    );
  }
},

  // POST /courseMember/:courseId/members
  addMember: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      if (!Number.isFinite(courseId)) {
        return c.json({ message: "Invalid courseId" }, 400);
      }

      const body = await c.req.json<{ userIds: number[] }>();
      if (!Array.isArray(body?.userIds) || body.userIds.length === 0) {
        return c.json({ message: "userIds must be a non-empty array" }, 400);
      }

      // normalize/unique + numeric
      const userIds = [
        ...new Set(
          body.userIds.map((id) => Number(id)).filter(Number.isFinite)
        ),
      ];
      if (userIds.length === 0) {
        return c.json({ message: "No valid userIds provided" }, 400);
      }

      // ensure course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });
      if (!course) return c.json({ message: "Course not found" }, 404);

      // ensure all users exist (keep your current behavior)
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });
      const existingIds = new Set(existingUsers.map((u) => u.id));
      const missingIds = userIds.filter((id) => !existingIds.has(id));
      if (missingIds.length > 0) {
        return c.json(
          { message: "Some users not found", missingUserIds: missingIds },
          404
        );
      }

      // use MODEL addMember for each user to avoid duplicates & keep logic in one place
      const results = await Promise.all(
        userIds.map((uid) => addMemberModel(courseId, uid))
      );

      const insertedCount = results.filter((r) => r.created).length;
      const skippedAsDuplicates = results.length - insertedCount;

      return c.json(
        {
          message: "Members processed",
          requestedCount: userIds.length,
          insertedCount,
          skippedAsDuplicates,
          // return the records (all), and which were newly created
          members: results.map((r) => r.member),
          createdUserIds: results
            .filter((r) => r.created)
            .map((r) => r.member.userId),
          existingUserIds: results
            .filter((r) => !r.created)
            .map((r) => r.member.userId),
        },
        201
      );
    } catch (e: any) {
      // prisma P2002 sanity (shouldn't happen because model guards, but just in case)
      if (e?.code === "P2002") {
        return c.json(
          { message: "Some users are already members of this course" },
          409
        );
      }
      return c.json(
        { message: "Failed to add member(s)", error: String(e?.message ?? e) },
        500
      );
    }
  },
};
