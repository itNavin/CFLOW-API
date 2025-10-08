// src/mail/course.mail.ts
import { formatBangkok } from "src/util/time";
import { prisma } from "../prisma";
import { mailTemplates, escapeHtml } from "../mail/main.mail";

export const courseMail = {
  createCourseMail: async (
    courseName: string,
    created: any,
    recipientName: string // 👈 add this
  ) => {
    const { createdBy } = await prisma.course.findUniqueOrThrow({
      where: { id: created.id },
      select: { createdBy: { select: { name: true, email: true, id: true } } },
    });

    const subject = `New course created: ${courseName}`;

    const createdAtDate = toDateOrUndefined(created?.createdAt);
    const createdAt = createdAtDate ? formatBangkok(createdAtDate) : undefined;

    const creatorName = createdBy?.name ?? "Unknown";
    const creatorEmail = createdBy?.email ?? "";

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">A new course has been created in <strong>C-Flow</strong>.</p>
${
  createdAt
    ? `<p style="margin:0 0 8px;color:#111111;"><strong>Created at:</strong> ${escapeHtml(
        createdAt
      )}</p>`
    : ""
}
<p style="margin:0 0 8px;color:#111111;"><strong>Created by:</strong> ${escapeHtml(
      creatorName
    )}${creatorEmail ? ` (${escapeHtml(creatorEmail)})` : ""}</p>
<p style="margin:0 0 12px;color:#111111;"><strong>Course:</strong> ${escapeHtml(
      courseName
    )}</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `New course created: ${courseName}`,
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      "A new course has been created in C-Flow.",
      createdAt ? `Created at: ${createdAt}` : "",
      `Created by: ${creatorName}${creatorEmail ? ` (${creatorEmail})` : ""}`,
      `Course: ${courseName}`,
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  updateCourseMail: async (
    courseName: string,
    updated: any,
    userId: string,
    recipientName: string // 👈 add this
  ) => {
    const subject = `Course updated: ${courseName}`;

    const updatedAtDate = toDateOrUndefined(updated?.updatedAt);
    const createdAtDate = toDateOrUndefined(updated?.createdAt);
    const primaryDate = updatedAtDate ?? createdAtDate;
    const primaryLabel = updatedAtDate
      ? "Updated at"
      : createdAtDate
      ? "Created at"
      : "";
    const primaryValue = primaryDate ? formatBangkok(primaryDate) : undefined;

    const updater = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const userName = updater?.name ?? "Unknown";
    const userEmail = updater?.email ?? "";

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">A course has been updated in <strong>C-Flow</strong>.</p>
${
  primaryValue
    ? `<p style="margin:0 0 8px;color:#111111;"><strong>${escapeHtml(
        primaryLabel
      )}:</strong> ${escapeHtml(primaryValue)}</p>`
    : ""
}
<p style="margin:0 0 8px;color:#111111;"><strong>Updated by:</strong> ${escapeHtml(
      userName
    )}${userEmail ? ` (${escapeHtml(userEmail)})` : ""}</p>
<p style="margin:0 0 12px;color:#111111;"><strong>Course:</strong> ${escapeHtml(
      courseName
    )}</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `Course updated: ${courseName}`,
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      "A course has been updated in C-Flow.",
      primaryValue ? `${primaryLabel}: ${primaryValue}` : "",
      `Updated by: ${userName}${userEmail ? ` (${userEmail})` : ""}`,
      `Course: ${courseName}`,
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },
};

function toDateOrUndefined(v: unknown): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v as any);
  return isNaN(d.getTime()) ? undefined : d;
}
