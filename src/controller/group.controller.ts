import { Context } from "hono";
import { prisma } from "../prisma";

import GroupModel from "../model/group.model";

import { GroupPayload } from "../types/payload/group.type";
import { isValidUUID } from "../types/uuid";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";
import { GroupMail } from "src/mail/group.mail";

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
      if (!isValidUUID(courseId)) {
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

      //mail
      // 1) Get course info (for courseName + program)
      const courseInfo = await prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true, program: true },
      });

      // 2) Gather all students in the new group (id, name, email)
      const groupStudentRows = await prisma.groupMember.findMany({
        where: { groupId: newGroup.id },
        select: {
          group: {
            select: {
              codeNumber: true,
              projectName: true,
              productName: true, // CS
              company: true, // DSI
            },
          },
          courseMember: {
            select: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      // 3) Build recipients (students with email) and the group payload
      const studentRecipients = groupStudentRows
        .map((r) => r.courseMember.user)
        .filter((u) => !!u.email);

      const groupPayload = groupStudentRows[0]?.group ?? {
        codeNumber: newGroup.codeNumber ?? null,
        projectName: newGroup.projectName,
        productName: newGroup.productName ?? null,
        company: newGroup.company ?? null,
      };

      // 4) Send ONE email per group to ALL students in that group
      if (studentRecipients.length > 0) {
        const { subject, html, text } = await GroupMail.createGroupStudentMail({
          courseName: courseInfo?.name ?? "your course",
          program: courseInfo?.program ?? "CS",
          group: {
            codeNumber: groupPayload.codeNumber ?? "",
            projectName: groupPayload.projectName,
            productName: groupPayload.productName,
            company: groupPayload.company,
          },
        });

        await mailSentAndSummary(studentRecipients, subject, html, text);
      }

      // 5) Advisors + co-advisors: one email PER advisor, with student list
      const advisorRows = await prisma.groupAdvisor.findMany({
        where: { groupId: newGroup.id },
        select: {
          advisorRole: true, // "ADVISOR" | "CO_ADVISOR"
          group: {
            select: {
              codeNumber: true,
              projectName: true,
              productName: true,
              company: true,
              members: {
                select: {
                  courseMember: {
                    select: {
                      user: { select: { id: true, name: true, email: true } },
                    },
                  },
                },
              },
            },
          },
          courseMember: {
            // the advisor's course member
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });

      // Build the student list once from any advisorRow (they all share the same group)
      const studentsForAdvisor =
        advisorRows[0]?.group.members.map((m) => m.courseMember.user) ?? [];

      for (const row of advisorRows) {
        const advisorUser = row.courseMember.user;
        if (!advisorUser.email) continue;

        const {
          subject: subjectLec,
          html: htmlLec,
          text: textLec,
        } = await GroupMail.createGroupLecturerMail({
          courseName: courseInfo?.name ?? "your course",
          program: courseInfo?.program ?? "CS",
          advisor: { name: advisorUser.name, role: row.advisorRole },
          group: {
            codeNumber: row.group.codeNumber ?? "",
            projectName: row.group.projectName,
            productName: row.group.productName,
            company: row.group.company,
          },
          students: studentsForAdvisor, // [{id,name,email}]
        });

        await mailSentAndSummary([advisorUser], subjectLec, htmlLec, textLec);
      }

      const mailStaffUsers = await mailRoles.getStaffInCourse(courseId);

      // advisors array with role + email for staff mail
      const advisorsForStaff =
        advisorRows.map((row) => ({
          name: row.courseMember.user.name,
          role: row.advisorRole as "ADVISOR" | "CO_ADVISOR",
          email: row.courseMember.user.email ?? null,
        })) ?? [];

      // students array (we already computed studentsForAdvisor above)
      const {
        subject: subjectStaff,
        html: htmlStaff,
        text: textStaff,
      } = await GroupMail.createGroupStaffMail({
        courseName: courseInfo?.name ?? "your course",
        program: courseInfo?.program ?? "CS",
        group: {
          codeNumber: groupPayload.codeNumber ?? "",
          projectName: groupPayload.projectName,
          productName: groupPayload.productName,
          company: groupPayload.company,
        },
        advisors: advisorsForStaff,
        students: studentsForAdvisor, // [{id,name,email}]
      });

      if (mailStaffUsers?.length) {
        await mailSentAndSummary(
          mailStaffUsers,
          subjectStaff,
          htmlStaff,
          textStaff
        );
      }

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
      if (!isValidUUID(courseId)) {
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
      if (!isValidUUID(courseId)) {
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
      if (!isValidUUID(courseId)) {
        return c.json({ error: "Invalid courseId (UUID expected)" }, 400);
      }

      const groupId = String(body.groupId ?? "").trim();
      if (!isValidUUID(groupId)) {
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

      //mail
      const mailStudentUsers = body.memberIds;
      const { subject, html, text } = await GroupMail.updateGroupStudentMail(
        updated
      );
      await mailSentAndSummary(mailStudentUsers, subject, html, text);

      const mailLecturerUsers =
        await GroupModel.getGroupAdvisorsAndCoAdvisorsById(updated.id);
      const {
        subject: subjectLec,
        html: htmlLec,
        text: textLec,
      } = await GroupMail.updateGroupLecturerMail(updated);
      await mailSentAndSummary(mailLecturerUsers, subjectLec, htmlLec, textLec);

      const mailStaffUsers = mailRoles.getStaffInCourse(courseId);
      const {
        subject: subjectStaff,
        html: htmlStaff,
        text: textStaff,
      } = await GroupMail.updateGroupStaffMail(updated);
      await mailSentAndSummary(
        await mailStaffUsers,
        subjectStaff,
        htmlStaff,
        textStaff
      );

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
  deleteGroup: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: staff only" }, 403);
      }
      const body = await c.req.json<{ groupId: string }>();
      const groupId = body.groupId;
      if (!isValidUUID(groupId)) {
        return c.json({ error: "Invalid groupId (UUID expected)" }, 400);
      }

      const ok = await GroupModel.deleteGroup(groupId);
      if (!ok) {
        return c.json({ error: "Group not found" }, 404);
      }

      //mail
      const courseId = await GroupModel.getCourseIdByGroupId(groupId);
      if (!courseId) {
        throw new Error("courseId is required for fetching staff users");
      }
      const mailStaffUsers = await mailRoles.getStaffInCourse(courseId);
      const { subject, html, text } = await GroupMail.deleteGroupStaffMail(
        groupId
      );
      await mailSentAndSummary(mailStaffUsers, subject, html, text);

      return c.json({ message: "Group deleted successfully" }, 200);
    } catch (error) {
      console.error({
        context: "deleteGroup",
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
