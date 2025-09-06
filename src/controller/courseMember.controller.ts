import { Context } from "hono";
import { prisma } from "../prisma";
import {
  getAllCourseMembers,
  getAdvisorMembers,
  getStudentMembers,
  getAdvisorNotInCourse,
  getStudentsNotInCourse,
  deleteCourseMembersBulk,
  addMember as addMemberModel, 
} from "../model/courseMember.model";
import { get } from "http";

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

  // GET /advisors/course/:courseId
  getAdvisorMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    if (!Number.isFinite(courseId)) {
      return c.json({ message: "Invalid courseId" }, 400);
    }

    const role = c.get("role");
    if (role !== "staff") {
      return c.json({ message: "Forbidden: STAFF only" }, 403);
    }

    const advisors = await getAdvisorMembers(courseId);
    return c.json(advisors);
  },

  getAdvisorNotInCourse: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));

      const advisorsNotInCourse = await getAdvisorNotInCourse(courseId);
      return c.json(advisorsNotInCourse, 200);
    } catch (e) {
      return c.json({ message: "Failed to fetch advisors" }, 500);
    }
  },

  getStudentNotInCourse: async (c: Context) => {
    try {
      const courseId = Number(c.req.param("courseId"));
      if (!Number.isFinite(courseId) || courseId <= 0) {
        return c.json({ message: "Invalid courseId" }, 400);
      }

      const students = await getStudentsNotInCourse(courseId);
      return c.json(students, 200);
    } catch (e) {
      console.error("getStudentNotInCourse error:", e);
      return c.json({ message: "Failed to fetch students" }, 500);
    }
  },

  // GET /students/course/:courseId
  getStudentMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    if (!Number.isFinite(courseId)) {
      return c.json({ message: "Invalid courseId" }, 400);
    }

    const role = c.get("role");
    if (role !== "staff") {
      return c.json({ message: "Forbidden: STAFF only" }, 403);
    }

    const students = await getStudentMembers(courseId);
    return c.json(students);
  },

  // DELETE /courseMember/delete/:courseMemberId
  deleteMembersBulk: async (c: Context) => {
    try {
      const role = c.get("role");
      // keep your original rule ("staff" literal). Adjust if needed.
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const body = await c.req.json<any>();
      const courseMemberIds = Array.isArray(body?.courseMemberIds)
        ? body.courseMemberIds
        : null;

      if (!courseMemberIds) {
        return c.json(
          { message: "Body must be { courseMemberIds: number[] }" },
          400
        );
      }

      const result = await deleteCourseMembersBulk(courseMemberIds);

      // Build a friendly message for blocked users
      const blockedNames = result.blocked.map((b) => b.userName);
      const message =
        blockedNames.length > 0
          ? `Cannot delete these users because they are linked to groups or logs: ${blockedNames.join(
              ", "
            )}`
          : `Deleted ${result.deletedIds.length} course member(s).`;

      // If anything blocked, use 409, else 200
      const status = blockedNames.length > 0 ? 409 : 200;

      return c.json(
        {
          message,
          summary: {
            requestedCount: result.requestedIds.length,
            deletedCount: result.deletedIds.length,
            notFoundCount: result.notFoundIds.length,
            blockedCount: result.blocked.length,
          },
          deletedIds: result.deletedIds,
          notFoundIds: result.notFoundIds,
          blocked: result.blocked, // contains reasons counts; names are in blocked[].userName
        },
        status
      );
    } catch (e: any) {
      const status = e?.status ?? 500;
      return c.json(
        { message: e?.message ?? "Failed to delete course members" },
        status
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

      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const body = await c.req.json<{ userIds: Array<string> }>();
      const raw = body?.userIds;
      if (!Array.isArray(raw) || raw.length === 0) {
        return c.json({ message: "userIds must be a non-empty array" }, 400);
      }

      const userIds: string[] = [
        ...new Set(
          raw
            .map((v) => String(v))
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        ),
      ];
      if (userIds.length === 0) {
        return c.json({ message: "No valid userIds provided" }, 400);
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });
      if (!course) return c.json({ message: "Course not found" }, 404);

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

      const results = await Promise.all(
        userIds.map((uid) => addMemberModel(courseId, uid)) // uid is string
      );

      const insertedCount = results.filter((r) => r.created).length;
      const skippedAsDuplicates = results.length - insertedCount;

      return c.json(
        {
          message: "Members processed",
          requestedCount: userIds.length,
          insertedCount,
          skippedAsDuplicates,
          members: results.map((r) => r.member),
          existingUserIds: results
            .filter((r) => !r.created)
            .map((r) => r.member.userId as string),
        },
        201
      );
    } catch (e: any) {
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
