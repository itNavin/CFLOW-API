import type { Context } from "hono";
import { prisma } from "../prisma";
import fs from "node:fs";
import path from "node:path";
import { enrollFromWorkbook } from "../model/excel.model";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";
import { GroupMail } from "src/mail/group.mail";

export const ImportController = {
  uploadAndEnroll: async (c: Context) => {
    const role = c.get("role");
    if (role !== "staff")
      return c.json(
        { message: "Forbidden: only staff can import enrollments" },
        403
      );

    const form = await c.req.formData();
    const file = form.get("file") as File | null;
    if (!file) return c.json({ message: "file is required" }, 400);
    const courseId = form.get("courseId") as string | null;
    if (!courseId) return c.json({ message: "courseId is required" }, 400);

    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    try {
      const result = await enrollFromWorkbook(courseId, buf);

      //mail
      const courseInfo = await prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true, program: true },
      });

      const groupIds = (result?.details ?? []).map(
        (d: { groupId: string }) => d.groupId
      );

      const groupStudentRows = await prisma.groupMember.findMany({
        where: { groupId: { in: groupIds } },
        select: {
          groupId: true,
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

      const byGroup = new Map<
        string,
        {
          group: {
            codeNumber: string | null;
            projectName: string;
            productName: string | null;
            company: string | null;
          };
          users: Array<{ id: string; name: string; email: string | null }>;
        }
      >();

      for (const row of groupStudentRows) {
        const g = byGroup.get(row.groupId) ?? {
          group: row.group,
          users: [],
        };
        g.users.push(row.courseMember.user);
        byGroup.set(row.groupId, g);
      }

      for (const [, bucket] of byGroup) {
        const recipients = bucket.users.filter((u) => !!u.email); 
        if (recipients.length === 0) continue;

        await mailSentAndSummary(recipients, async (u) => {
          return GroupMail.createGroupStudentMail({
            courseName: courseInfo?.name ?? "your course",
            program: courseInfo?.program ?? "CS",
            group: {
              codeNumber: bucket.group.codeNumber ?? "",
              projectName: bucket.group.projectName,
              productName: bucket.group.productName,
              company: bucket.group.company,
            },
            recipientName: u.name || "Student",
          });
        });
      }

      const advisorRows = await prisma.groupAdvisor.findMany({
        where: { groupId: { in: groupIds } },
        select: {
          advisorRole: true, 
          groupId: true,
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
                  workRole: true,
                },
              },
            },
          },
          courseMember: {
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      });

      type PlainUser = { id: string; name: string; email: string | null };
      const advisorsByGroup = new Map<
        string,
        {
          group: {
            codeNumber: string | null;
            projectName: string;
            productName: string | null;
            company: string | null;
          };
          advisors: Array<{ user: PlainUser; role: "ADVISOR" | "CO_ADVISOR" }>;
          students: PlainUser[];
        }
      >();

      for (const row of advisorRows) {
        const current = advisorsByGroup.get(row.groupId) ?? {
          group: {
            codeNumber: row.group.codeNumber ?? "",
            projectName: row.group.projectName,
            productName: row.group.productName,
            company: row.group.company,
          },
          advisors: [],
          students: row.group.members.map((m) => m.courseMember.user),
        };

        current.advisors.push({
          user: row.courseMember.user,
          role: row.advisorRole,
        });

        advisorsByGroup.set(row.groupId, current);
      }

      for (const [, bucket] of advisorsByGroup) {
        for (const adv of bucket.advisors) {
          if (!adv.user.email) continue;

          const { subject, html, text } =
            await GroupMail.createGroupLecturerMail({
              courseName: courseInfo?.name ?? "your course",
              program: courseInfo?.program ?? "CS",
              advisor: { name: adv.user.name, role: adv.role },
              group: {
                codeNumber: bucket.group.codeNumber ?? "",
                projectName: bucket.group.projectName,
                productName: bucket.group.productName,
                company: bucket.group.company,
              },
              students: bucket.students, 
            });

          await mailSentAndSummary([adv.user], subject, html, text);
        }
      }

      const staffRecipients = await mailRoles.getStaffInCourse(courseId);

      if (Array.isArray(staffRecipients) && staffRecipients.length > 0) {
        for (const [, bucket] of advisorsByGroup) {
          const advisorsForStaff =
            (bucket.advisors ?? []).map((a) => ({
              name: a.user.name,
              role: a.role as "ADVISOR" | "CO_ADVISOR",
              email: a.user.email ?? null,
            })) ?? [];

          const studentsForStaff = bucket.students ?? [];

          const {
            subject: subjectStaff,
            html: htmlStaff,
            text: textStaff,
          } = await GroupMail.createGroupStaffMail({
            courseName: courseInfo?.name ?? "your course",
            program: courseInfo?.program ?? "CS",
            group: {
              codeNumber: bucket.group.codeNumber ?? "",
              projectName: bucket.group.projectName,
              productName: bucket.group.productName,
              company: bucket.group.company,
            },
            advisors: advisorsForStaff,
            students: studentsForStaff,
          });

          await mailSentAndSummary(
            staffRecipients,
            subjectStaff,
            htmlStaff,
            textStaff
          );
        }
      }
      return c.json({
        message: "upload successfully",
        result: result,
      });
    } catch (err: any) {
      console.error("Enroll import error:", err);
      return c.json({ message: err?.message ?? "Import failed" }, 400);
    }
  },
};
