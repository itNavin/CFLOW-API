import { formatBangkok } from "src/util/time";
import { prisma } from "../prisma";
import { mailTemplates, escapeHtml } from "../mail/main.mail";

export const courseMail = {
  createCourseMail: async (
    courseName: string,
    created: any,
    recipientName: string
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
      "A new course has been created in C-Flow.",
      createdAt ? `Created at: ${createdAt}` : "",
      `Created by: ${creatorName}${creatorEmail ? ` (${creatorEmail})` : ""}`,
      `Course: ${courseName}`,
    ]);

    return { subject, html, text };
  },

  updateCourseMail: async (
    courseName: string,
    updated: any,
    userId: string,
    recipientName: string
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
      "A course has been updated in C-Flow.",
      primaryValue ? `${primaryLabel}: ${primaryValue}` : "",
      `Updated by: ${userName}${userEmail ? ` (${userEmail})` : ""}`,
      `Course: ${courseName}`,
    ]);

    return { subject, html, text };
  },
  
  deleteCourseMail: async (
    courseNameLike: string | { name?: string } | null | undefined,
    recipientName: string,
    deletedAtOrOpts?:
      | Date
      | string
      | {
          deletedAt?: Date | string;
          deletedBy?: { name?: string | null; email?: string | null } | null;
        }
  ) => {
    const courseName =
      typeof courseNameLike === "string"
        ? courseNameLike
        : courseNameLike?.name ?? "(unknown course)";

    const opts =
      deletedAtOrOpts &&
      typeof deletedAtOrOpts === "object" &&
      !("toISOString" in (deletedAtOrOpts as any))
        ? (deletedAtOrOpts as {
            deletedAt?: Date | string;
            deletedBy?: { name?: string | null; email?: string | null } | null;
          })
        : {
            deletedAt: deletedAtOrOpts as Date | string | undefined,
            deletedBy: undefined,
          };

    const when = opts.deletedAt
      ? formatBangkok(new Date(opts.deletedAt))
      : formatBangkok(new Date());

    const deletedByName = opts.deletedBy?.name || undefined;
    const deletedByEmail = opts.deletedBy?.email || undefined;

    const subject = `Course deleted: ${courseName}`;

    const deletedByLineHtml =
      deletedByName || deletedByEmail
        ? `<p style="margin:0 0 8px;color:#111111;"><strong>Deleted by:</strong> ${escapeHtml(
            deletedByName ?? "Unknown"
          )}${deletedByEmail ? ` (${escapeHtml(deletedByEmail)})` : ""}</p>`
        : "";

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">A course was deleted in <strong>C-Flow</strong>.</p>
<p style="margin:0 0 8px;color:#111111;"><strong>Deleted at:</strong> ${escapeHtml(
      when
    )}</p>
${deletedByLineHtml}
<p style="margin:0 0 12px;color:#111111;"><strong>Course:</strong> ${escapeHtml(
      courseName
    )}</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `Course deleted: ${courseName}`,
    });

    const deletedByLineText =
      deletedByName || deletedByEmail
        ? `Deleted by: ${deletedByName ?? "Unknown"}${
            deletedByEmail ? ` (${deletedByEmail})` : ""
          }`
        : undefined;

    const text = mailTemplates.textTemplate([
      "A course was deleted in C-Flow.",
      `Deleted at: ${when}`,
      deletedByLineText ?? "",
      `Course: ${courseName}`,
    ]);

    return { subject, html, text };
  },
};

function toDateOrUndefined(v: unknown): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v as any);
  return isNaN(d.getTime()) ? undefined : d;
}
