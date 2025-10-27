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
        return c.json({ message: "Invalid courseId (UUID expected)" }, 400);
      }

      if (!body?.projectName) {
        return c.json({ message: "projectName is required" }, 400);
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
      const courseInfo = await prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true, program: true },
      });

      const groupStudentRows = await prisma.groupMember.findMany({
        where: { groupId: newGroup.id },
        select: {
          group: {
            select: {
              codeNumber: true,
              projectName: true,
              productName: true, 
              company: true, 
            },
          },
          courseMember: {
            select: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      const studentRecipients = groupStudentRows
        .map((r) => r.courseMember.user)
        .filter((u) => !!u.email);

      const groupPayload = groupStudentRows[0]?.group ?? {
        codeNumber: newGroup.codeNumber ?? null,
        projectName: newGroup.projectName,
        productName: newGroup.productName ?? null,
        company: newGroup.company ?? null,
      };

      if (studentRecipients.length > 0) {
        await mailSentAndSummary(studentRecipients, async (u) =>
          GroupMail.createGroupStudentMail({
            courseName: courseInfo?.name ?? "your course",
            program: courseInfo?.program ?? "CS",
            group: {
              codeNumber: groupPayload.codeNumber ?? "",
              projectName: groupPayload.projectName,
              productName: groupPayload.productName,
              company: groupPayload.company,
            },
            recipientName: u?.name || "Student",
          })
        );
      }

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
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });

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
          students: studentsForAdvisor, 
        });

        await mailSentAndSummary([advisorUser], subjectLec, htmlLec, textLec);
      }

      const mailStaffUsers = await mailRoles.getStaffInCourse(courseId);

      const advisorsForStaff =
        advisorRows.map((row) => ({
          name: row.courseMember.user.name,
          role: row.advisorRole as "ADVISOR" | "CO_ADVISOR",
          email: row.courseMember.user.email ?? null,
        })) ?? [];

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
        students: studentsForAdvisor,
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
        return c.json({ message: error.message }, 400);
      }
      if (error?.code === "P2002") {
        return c.json({ message: "Duplicate codeNumber in this course" }, 409);
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
        return c.json({ message: "Invalid courseId (UUID expected)" }, 400);
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
        return c.json({ message: "Invalid courseId (UUID expected)" }, 400);
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
        return c.json({ message: "Invalid courseId (UUID expected)" }, 400);
      }

      const groupId = String(body.groupId ?? "").trim();
      if (!isValidUUID(groupId)) {
        return c.json({ message: "Invalid groupId (UUID expected)" }, 400);
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

      const courseInfo = await prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true, program: true },
      });

      const groupRow = await prisma.group.findUnique({
        where: { id: updated.id },
        select: {
          codeNumber: true,
          projectName: true,
          productName: true,
          company: true,
        },
      });

      const studentRows = await prisma.groupMember.findMany({
        where: { groupId: updated.id },
        select: {
          courseMember: {
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });
      const students = studentRows.map((r) => r.courseMember.user);
      const studentRecipients = students.filter((u) => !!u.email);

      const advisorRows = await prisma.groupAdvisor.findMany({
        where: { groupId: updated.id },
        select: {
          advisorRole: true,
          courseMember: {
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });
      const advisorsForStaff = advisorRows.map((r) => ({
        name: r.courseMember.user.name,
        role: r.advisorRole as "ADVISOR" | "CO_ADVISOR",
        email: r.courseMember.user.email ?? null,
      }));

      await mailSentAndSummary(studentRecipients, async (u) => {
        const { subject, html, text } = await GroupMail.updateGroupStudentMail({
          courseName: courseInfo?.name ?? "your course",
          program: courseInfo?.program ?? "CS",
          group: {
            codeNumber: groupRow?.codeNumber ?? "",
            projectName: groupRow?.projectName ?? "",
            productName: groupRow?.productName ?? null,
            company: groupRow?.company ?? null,
          },
          students,
          advisors: advisorsForStaff,
          recipientName: u.name,
        });
        return { subject, html, text };
      });


      for (const r of advisorRows) {
        const adviserUser = r.courseMember.user;
        if (!adviserUser.email) continue;

        const {
          subject: subjectLec,
          html: htmlLec,
          text: textLec,
        } = await GroupMail.updateGroupLecturerMail({
          courseName: courseInfo?.name ?? "your course",
          program: courseInfo?.program ?? "CS",
          advisor: {
            name: adviserUser.name,
            role: r.advisorRole as "ADVISOR" | "CO_ADVISOR",
          },
          group: {
            codeNumber: groupRow?.codeNumber ?? "",
            projectName: groupRow?.projectName ?? "",
            productName: groupRow?.productName ?? null,
            company: groupRow?.company ?? null,
          },
          students,
          advisors: advisorsForStaff, 
        });

        await mailSentAndSummary([adviserUser], subjectLec, htmlLec, textLec);
      }

      const staffRecipients = await mailRoles.getStaffInCourse(courseId);
      if (Array.isArray(staffRecipients) && staffRecipients.length > 0) {
        const {
          subject: subjectStaff,
          html: htmlStaff,
          text: textStaff,
        } = await GroupMail.updateGroupStaffMail({
          courseName: courseInfo?.name ?? "your course",
          program: courseInfo?.program ?? "CS",
          group: {
            codeNumber: groupRow?.codeNumber ?? "",
            projectName: groupRow?.projectName ?? "",
            productName: groupRow?.productName ?? null,
            company: groupRow?.company ?? null,
          },
          advisors: advisorsForStaff,
          students,
        });

        await mailSentAndSummary(
          staffRecipients,
          subjectStaff,
          htmlStaff,
          textStaff
        );
      }

      return c.json(
        {
          message: "Group updated successfully",
          group: updated,
        },
        200
      );
    } catch (error: any) {
      if (error?.status === 404) return c.json({ message: error.message }, 404);
      if (error?.status === 400) return c.json({ message: error.message }, 400);
      if (error?.code === "P2002") {
        return c.json({ message: "Duplicate codeNumber in this course" }, 409);
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
        return c.json({ message: "Invalid groupId (UUID expected)" }, 400);
      }

      const groupRow = await prisma.group.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          courseId: true,
          codeNumber: true,
          projectName: true,
          productName: true,
          company: true,
        },
      });
      if (!groupRow) return c.json({ message: "Group not found" }, 404);

      const courseInfo = await prisma.course.findUnique({
        where: { id: groupRow.courseId },
        select: { name: true, program: true },
      });

      const advisorRows = await prisma.groupAdvisor.findMany({
        where: { groupId },
        select: {
          advisorRole: true,
          courseMember: {
            select: { user: { select: { name: true, email: true } } },
          },
        },
      });
      const advisorsForStaff = advisorRows.map((r) => ({
        name: r.courseMember.user.name,
        role: r.advisorRole as "ADVISOR" | "CO_ADVISOR",
        email: r.courseMember.user.email ?? null,
      }));

      const studentRows = await prisma.groupMember.findMany({
        where: { groupId },
        select: {
          courseMember: {
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });
      const studentsForStaff = studentRows.map((r) => r.courseMember.user);

      const staffRecipients = await mailRoles.getStaffInCourse(
        groupRow.courseId
      );

      const ok = await GroupModel.deleteGroup(groupId);
      if (!ok) {
        return c.json({ message: "Group not found" }, 404);
      }

      if (Array.isArray(staffRecipients) && staffRecipients.length > 0) {
        const { subject, html, text } = await GroupMail.deleteGroupStaffMail({
          courseName: courseInfo?.name ?? "your course",
          program: courseInfo?.program ?? "CS",
          group: {
            codeNumber: groupRow.codeNumber,
            projectName: groupRow.projectName,
            productName: groupRow.productName,
            company: groupRow.company,
          },
          advisors: advisorsForStaff,
          students: studentsForStaff,
          deletedAt: new Date(),
        });

        await mailSentAndSummary(staffRecipients, subject, html, text);
      }

      return c.json({ message: "Group deleted successfully", groupId }, 200);
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
