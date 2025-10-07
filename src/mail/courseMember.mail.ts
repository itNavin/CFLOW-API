import { prisma } from "src/prisma";
import { formatBangkok } from "src/util/time";

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
              <p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(
                recipientName
              )},</p>
              <p style="margin:0 0 12px;color:#111111;">You have been added to <strong>${escapeHtml(
                courseName
              )}</strong>.</p>
              <p style="margin:0 0 12px;color:#111111;"><strong>Added by:</strong> ${escapeHtml(
                addedByName
              )}${addedByEmail ? ` (${escapeHtml(addedByEmail)})` : ""}</p>
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
      `Dear ${recipientName},`,
      "",
      `You have been added to ${courseName}.`,
      `Added by: ${addedByName}${addedByEmail ? ` (${addedByEmail})` : ""}`,
      "",
      "Best regards,",
      "C-Flow Team",
    ].join("\n");

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
              <p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(
                recipientName
              )},</p>
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
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, html, text };
  },
};

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
