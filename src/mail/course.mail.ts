import { formatBangkok } from "src/util/time";
import { prisma } from "../prisma";

export const courseMail = {
  createCourseMail: async (courseName: string, created: any) => {
    const { createdBy } = await prisma.course.findUniqueOrThrow({
      where: { id: created.id },
      select: { createdBy: { select: { name: true, email: true, id: true } } },
    });

    const subject = `New course created: ${courseName}`;

    const createdAtDate = toDateOrUndefined(created?.createdAt);
    const createdAt = createdAtDate ? formatBangkok(createdAtDate) : undefined;

    const creatorName = createdBy?.name ?? "Unknown";
    const creatorEmail = createdBy?.email ?? "";

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <style>
      a, a:visited, a:hover, a:active { color:#111111 !important; text-decoration:none !important; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;">
            <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
              <p style="margin:0 0 12px;color:#111111;">Dear user,</p>
              <p style="margin:0 8px 8px 0;color:#111111;">A new course has been created in <strong>C-Flow</strong>.</p>
              ${
                createdAt
                  ? `<p style="margin:0 0 8px;color:#111111;"><strong>Created at:</strong> ${escapeHtml(
                      createdAt
                    )}</p>`
                  : ""
              }
              <p style="margin:0 0 12px;color:#111111;"><strong>Created by:</strong> ${escapeHtml(
                creatorName
              )}${creatorEmail ? ` (${escapeHtml(creatorEmail)})` : ""}</p>
              <p style="margin:0 0 12px;color:#111111;"><strong>Course:</strong> ${escapeHtml(
                courseName
              )}</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const text = [
      subject,
      "",
      "Dear user,",
      "",
      "A new course has been created in C-Flow.",
      createdAt ? `Created at: ${createdAt}` : "",
      `Created by: ${creatorName}${creatorEmail ? ` (${creatorEmail})` : ""}`,
      `Course: ${courseName}`,
      "",
      "Best regards,",
      "C-Flow Team",
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, html, text };
  },

  updateCourseMail: async (
    courseName: string,
    updated: any,
    userId: string
  ) => {
    const subject = `Course updated: ${courseName}`;

    // Primary timestamp: prefer updatedAt, else createdAt
    const updatedAtDate = toDateOrUndefined(updated?.updatedAt);
    const createdAtDate = toDateOrUndefined(updated?.createdAt);
    const primaryDate = updatedAtDate ?? createdAtDate;
    const primaryLabel = updatedAtDate
      ? "Updated at"
      : createdAtDate
      ? "Created at"
      : "";
    const primaryValue = primaryDate ? formatBangkok(primaryDate) : undefined;

    // Lookup updater
    const updater = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const userName = updater?.name ?? "Unknown";
    const userEmail = updater?.email ?? "";

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <style>
      a, a:visited, a:hover, a:active { color:#111111 !important; text-decoration:none !important; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;">
            <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
              <p style="margin:0 0 12px;color:#111111;">Dear user,</p>
              <p style="margin:0 8px 8px 0;color:#111111;">A course has been updated in <strong>C-Flow</strong>.</p>
              ${
                primaryValue
                  ? `<p style="margin:0 0 8px;color:#111111;"><strong>${primaryLabel}:</strong> ${escapeHtml(
                      primaryValue
                    )}</p>`
                  : ""
              }
              <p style="margin:0 0 8px;color:#111111;"><strong>Updated by:</strong> ${escapeHtml(
                userName
              )}${userEmail ? ` (${escapeHtml(userEmail)})` : ""}</p>
              <p style="margin:0 0 12px;color:#111111;"><strong>Course:</strong> ${escapeHtml(
                courseName
              )}</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const text = [
      subject,
      "",
      "Dear user,",
      "",
      "A course has been updated in C-Flow.",
      primaryValue ? `${primaryLabel}: ${primaryValue}` : "",
      `Updated by: ${userName}${userEmail ? ` (${userEmail})` : ""}`,
      `Course: ${courseName}`,
      "",
      "Best regards,",
      "C-Flow Team",
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, html, text };
  },
};

function toDateOrUndefined(v: unknown): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v as any);
  return isNaN(d.getTime()) ? undefined : d;
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
