import { formatBangkok } from "src/util/time";

export const announcementMail = {
  async createAnnouncementMail(courseName: string, created: any) {
    const subject = `New announcement: ${created.name} — ${courseName}`;

    const scheduleDate = toDateOrUndefined(created?.schedule);
    const createdAtDate = toDateOrUndefined(created?.createdAt);

    const whenRaw =
      scheduleDate && !isEpoch1970(scheduleDate) ? scheduleDate : createdAtDate;

    const when = whenRaw ? formatBangkok(whenRaw) : undefined;

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
              <p style="margin:0 8px 8px 0;color:#111111;">There’s a new announcement in <strong>${escapeHtml(
                courseName
              )}</strong>.</p>
              ${
                when
                  ? `<p style="margin:0 0 12px;color:#111111;"><strong>Time:</strong> ${escapeHtml(
                      when
                    )}</p>`
                  : ""
              }
              <p style="margin:0 0 12px;color:#111111;"><strong>${escapeHtml(
                created.name
              )}</strong></p>
              ${
                created.description
                  ? `<p style="margin:0 0 12px;color:#111111;">${escapeHtml(
                      created.description
                    )}</p>`
                  : ""
              }
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
      `There’s a new announcement in ${courseName}.`,
      when ? `Time: ${when}` : "",
      created.name ? `\n${created.name}` : "",
      created.description ? `\n${created.description}` : "",
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

function isEpoch1970(d: Date): boolean {
  return d.getFullYear() === 1970 || d.getUTCFullYear() === 1970;
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
