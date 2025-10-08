import { prisma } from "src/prisma";
import { formatBangkok } from "src/util/time";
import { mailTemplates, escapeHtml } from "../mail/main.mail";

export const courseMemberMail = {
  // recipientName = the user who got added
  // addedByUserId = the staff/lecturer who added them
  addMemberMail: async (
    courseName: string,
    recipientName: string,
    addedByUserId: string
  ) => {
    const addedBy = await prisma.user.findUnique({
      where: { id: addedByUserId },
      select: { name: true, email: true },
    });

    const addedByName = addedBy?.name ?? "Unknown";
    const addedByEmail = addedBy?.email ?? "";

    const subject = `Added to course: ${courseName}`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 0 12px;color:#111111;">You have been added to <strong>${escapeHtml(
      courseName
    )}</strong>.</p>
<p style="margin:0 0 12px;color:#111111;"><strong>Added by:</strong> ${escapeHtml(
      addedByName
    )}${addedByEmail ? ` (${escapeHtml(addedByEmail)})` : ""}</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `You’ve been added to ${courseName}`,
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      `You have been added to ${courseName}.`,
      `Added by: ${addedByName}${addedByEmail ? ` (${addedByEmail})` : ""}`,
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  deleteMemberMail: async (
    courseName: string,
    recipientName: string,
    deletedByUserId: string,
    removedAt?: Date | string
  ) => {
    const deleter = await prisma.user.findUnique({
      where: { id: deletedByUserId },
      select: { name: true, email: true },
    });

    const deletedByName = deleter?.name ?? "Unknown";
    const deletedByEmail = deleter?.email ?? "";

    const removedAtStr = removedAt ? formatBangkok(removedAt) : undefined;

    const subject = `Removed from course: ${courseName}`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 0 12px;color:#111111;">You have been removed from <strong>${escapeHtml(
      courseName
    )}</strong>.</p>
${
  removedAtStr
    ? `<p style="margin:0 0 8px;color:#111111;"><strong>Removed at:</strong> ${escapeHtml(
        removedAtStr
      )}</p>`
    : ""
}
<p style="margin:0 0 12px;color:#111111;"><strong>Removed by:</strong> ${escapeHtml(
      deletedByName
    )}${deletedByEmail ? ` (${escapeHtml(deletedByEmail)})` : ""}</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `You’ve been removed from ${courseName}`,
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      `You have been removed from ${courseName}.`,
      removedAtStr ? `Removed at: ${removedAtStr}` : "",
      `Removed by: ${deletedByName}${
        deletedByEmail ? ` (${deletedByEmail})` : ""
      }`,
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },
};
