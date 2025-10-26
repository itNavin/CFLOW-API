import type { Context } from "hono";
import { prisma } from "../prisma";
import AssignmentModel from "../model/assignment.model";
import { AssignmentPayload } from "src/types/payload/assignment.types";
import { isValidUUID } from "../types/uuid";
import { assignmentMail } from "src/mail/assignment.mail";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";
import SubmissionModel from "src/model/submission.model";
import { StorageController } from "./storage.controller";
import { ensureOrigin } from "src/util/storage";

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
      const description = body.description;

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
      const courseRow = await mailRoles.coursename(courseId);
      if (!courseRow) return c.json({ error: "Course not found" }, 404);

      await mailSentAndSummary(mailUsers, async (u) => {
        const recipientName = u?.user?.name || u?.name || "User";
        return assignmentMail.createAssignmentMail(
          courseRow.name,
          created,
          recipientName
        );
      });

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
      if (role !== "staff") {
        return c.json({ error: "Forbidden: STAFF only" }, 403);
      }

      // ---- read form-data instead of JSON
      const form = await c.req.formData();
      const requestOrigin = ensureOrigin(new URL(c.req.url).origin);

      // helpers
      const getStr = (key: string) => {
        const v = form.get(key);
        return typeof v === "string" ? v.trim() : "";
      };
      const getOptionalStr = (key: string) => {
        const v = form.get(key);
        if (typeof v !== "string") return null;
        const trimmed = v.trim();
        return trimmed.length ? trimmed : null;
      };
      const mustStr = (key: string, label?: string) => {
        const v = getStr(key);
        if (!v) throw new Error(`${label ?? key} is required`);
        return v;
      };
      const parseISODate = (key: string, label?: string) => {
        const raw = mustStr(key, label ?? key);
        const d = new Date(raw);
        if (isNaN(d.getTime())) {
          throw new Error(`${label ?? key} must be a valid ISO datetime`);
        }
        return d;
      };

      // ---- fields from form-data
      const assignmentId = mustStr("assignmentId", "assignmentId");
      if (!isValidUUID(assignmentId)) {
        return c.json({ error: "assignmentId must be a valid UUID" }, 400);
      }

      // cannot update once there are submissions
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

      const name = mustStr("name", "name");
      const description = getOptionalStr("description");

      const endDate = parseISODate("endDate", "endDate");
      const schedule = parseISODate("schedule", "schedule");
      const dueDate = parseISODate("dueDate", "dueDate");

      // ---- deliverables parsing (supports two formats)
      type Deliverable = { name: string; allowedFileTypes: string[] };

      const parseRequiredDeliverables = (): Deliverable[] => {
        // Prefer a JSON string field "deliverables"
        const rawJson = form.get("deliverables");
        if (typeof rawJson === "string") {
          let arr: any;
          try {
            arr = JSON.parse(rawJson);
          } catch (e: any) {
            throw new Error(
              `Invalid deliverables JSON: ${e?.message ?? String(e)}`
            );
          }
          if (!Array.isArray(arr))
            throw new Error("deliverables must be an array");
          return arr.map((d, i) => {
            const name = String(d?.name ?? "").trim();
            if (!name) throw new Error(`deliverables[${i}].name is required`);
            const allowedFileTypes = Array.isArray(d?.allowedFileTypes)
              ? d.allowedFileTypes
                  .map((t: any) => String(t).trim())
                  .filter(Boolean)
              : [];
            return { name, allowedFileTypes };
          });
        }

        // Fallback: indexed fields deliverables[0][name], deliverables[0][allowedFileTypes][]
        const indices = new Set<number>();
        for (const key of Array.from(form.keys())) {
          const m = key.match(
            /^deliverables\[(\d+)\]\[(name|allowedFileTypes)\](\[\])?$/
          );
          if (m) indices.add(Number(m[1]));
        }
        if (indices.size === 0) {
          throw new Error(
            "deliverables is required (send JSON field 'deliverables' or indexed keys)"
          );
        }

        const out: Deliverable[] = [];
        for (const i of Array.from(indices).sort((a, b) => a - b)) {
          const nameKey = `deliverables[${i}][name]`;
          const dn = form.get(nameKey);
          const name = typeof dn === "string" ? dn.trim() : "";
          if (!name) throw new Error(`${nameKey} is required`);

          const aftKey = `deliverables[${i}][allowedFileTypes][]`;
          const allowedFileTypes = form
            .getAll(aftKey)
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim())
            .filter(Boolean);

          out.push({ name, allowedFileTypes });
        }
        return out;
      };

      const deliverables = parseRequiredDeliverables();

      // then call model
      const updated = await AssignmentModel.updateAssignment({
        assignmentId,
        name,
        description,
        endDate,
        schedule,
        dueDate,
        deliverables, // ALWAYS present → replace in DB to match input
      });

      if (!updated) {
        return c.json({ error: "Assignment not found" }, 404);
      }

      // ---- FILES: preserve kept rows + add new rows with names ----

      // We need courseId to namespace uploads
      const assignmentRow = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { courseId: true },
      });
      if (!assignmentRow) return c.json({ error: "Assignment not found" }, 404);
      const courseId = assignmentRow.courseId;

      // 1) Parse keepUrls (existing URLs that should remain)
      let keepUrls: string[] = [];
      const keepRaw = getStr("keepUrls"); // e.g. '["http://.../file1.pdf"]'
      if (keepRaw) {
        try {
          const arr = JSON.parse(keepRaw);
          if (!Array.isArray(arr)) throw new Error("keepUrls must be an array");
          keepUrls = arr.map((s: any) => String(s)).filter(Boolean);
        } catch (e: any) {
          return c.json(
            { error: `Invalid keepUrls JSON: ${e?.message ?? String(e)}` },
            400
          );
        }
      }

      // 2) Fetch existing rows so we can preserve names for kept URLs
      const existingFiles = await prisma.assignmentFile.findMany({
        where: { assignmentId },
        select: { id: true, fileUrl: true, name: true },
      });
      const existingByUrl = new Map(existingFiles.map((r) => [r.fileUrl, r]));

      // 3) Gather new uploads (accept both files and files[])
      const isFileLike = (v: any): v is File =>
        v &&
        typeof v === "object" &&
        typeof (v as any).name === "string" &&
        typeof (v as any).arrayBuffer === "function";

      const mergedInputs = [...form.getAll("files"), ...form.getAll("files[]")];
      const newFiles = mergedInputs.filter(isFileLike) as File[];

      // upload and remember URL + original filename
      type Uploaded = { url: string; name: string };
      const uploaded: Uploaded[] = [];
      for (const f of newFiles) {
        const url = await StorageController.uploadAssignmentFileCore({
          courseId,
          assignmentId,
          file: f,
          origin: requestOrigin,
        });
        uploaded.push({ url, name: f.name });
      }

      // 4) Compute final URL set
      const finalUrls = new Set<string>([
        ...keepUrls,
        ...uploaded.map((u) => u.url),
      ]);

      // 5) Delete rows that are NOT in final set
      const toDeleteIds = existingFiles
        .filter((r) => !finalUrls.has(r.fileUrl))
        .map((r) => r.id);

      if (toDeleteIds.length) {
        await prisma.assignmentFile.deleteMany({
          where: { id: { in: toDeleteIds } },
        });
      }

      // 6) Create rows for new URLs only (those not already in DB)
      //    Use the original filename from the upload
      const existingUrlSet = new Set(existingFiles.map((r) => r.fileUrl));
      const toCreate = uploaded
        .filter((u) => !existingUrlSet.has(u.url))
        .map((u) => ({
          assignmentId,
          fileUrl: u.url,
          name: u.name, // <-- save original filename here
        }));

      if (toCreate.length) {
        await prisma.assignmentFile.createMany({ data: toCreate });
      }

      // (Kept rows remain untouched, so their names are preserved)

      // ---- mail fan-out (unchanged)
      const mailCourseId = await SubmissionModel.getCourseIdByAssignment(
        assignmentId
      );
      if (!mailCourseId) {
        return c.json({ error: "Course not found" }, 404);
      }

      const mailUsers = await mailRoles.test(mailCourseId);
      const courseRow = await mailRoles.coursename(mailCourseId);
      if (!courseRow) return c.json({ error: "Course not found" }, 404);

      await mailSentAndSummary(mailUsers, async (u) => {
        const recipientName =
          (u as any)?.user?.name || (u as any)?.name || "User";
        return assignmentMail.updateAssignmentMail(
          courseRow.name,
          updated,
          recipientName
        );
      });

      return c.json(
        {
          message: "The assignment has been updated successfully",
          assignment: updated,
        },
        200
      );
    } catch (error: any) {
      // convert thrown validation errors from helpers
      const msg = typeof error?.message === "string" ? error.message : null;
      if (msg?.includes("required") || msg?.includes("must be a valid")) {
        return c.json({ error: msg }, 400);
      }

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

      const assignmentRow = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          name: true,
          courseId: true,
          dueDate: true,
          schedule: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!assignmentRow) {
        return c.json({ error: "Assignment not found" }, 404);
      }

      const ok = await AssignmentModel.deleteAssignment(assignmentId);
      if (!ok) {
        return c.json({ error: "Assignment not found" }, 404);
      }

      const staff = await mailRoles.getStaffInCourse(assignmentRow.courseId);
      const courseRow = await mailRoles.coursename(assignmentRow.courseId);
      const deleter = await prisma.user.findUnique({
        where: { id: c.get("userId") },
        select: { name: true, email: true },
      });

      if (courseRow && Array.isArray(staff) && staff.length) {
        await mailSentAndSummary(staff, async (u) => {
          const recipientName = u?.user?.name || u?.name || "User";
          return assignmentMail.deleteAssignmentMail(
            courseRow.name,
            assignmentRow,
            { name: deleter?.name, email: deleter?.email },
            recipientName
          );
        });
      }

      return c.json(
        {
          message: "The assignment has been deleted successfully",
          delete: ok,
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
  getAssignmentById: async (c: Context) => {
    try {
      const role = c.get("role");
      const assignmentId = c.req.param("assignmentId");
      if (!assignmentId) {
        return c.json({ message: "assignmentId is required" }, 400);
      }
      if (!isValidUUID(assignmentId)) {
        return c.json({ message: "assignmentId must be a valid UUID" }, 400);
      }

      const assignment = await AssignmentModel.getAssignmentById(assignmentId);

      if (!assignment) {
        return c.json({ message: "Assignment not found" }, 404);
      }

      return c.json(
        {
          message: "Assignment retrieved successfully",
          assignment: assignment,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "getAssignmentById",
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
