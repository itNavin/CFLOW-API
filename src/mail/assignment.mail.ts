import { formatBangkok } from "src/util/time";

export const assignmentMail = {
  async createAssignmentMail(courseName: string, created: any) {
    const subject = `New assignment: ${created.name} â€” ${courseName}`;

    const scheduleDate = toDateOrUndefined(created?.schedule);
    const createdAtDate = toDateOrUndefined(created?.createdAt);
    const dueDateDate = toDateOrUndefined(created?.dueDate);

    const showSchedule = !!(scheduleDate && !isEpoch1970(scheduleDate));
    const primaryTimeLabel = showSchedule ? "Schedule" : "Created at";
    const primaryTimeValue = showSchedule
      ? formatBangkok(scheduleDate!)
      : createdAtDate
      ? formatBangkok(createdAtDate)
      : undefined;

    const dueDateStr =
      dueDateDate && !isEpoch1970(dueDateDate)
        ? formatBangkok(dueDateDate)
        : "(not set)";

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
              <p style="margin:0 8px 8px 0;color:#111111;">Thereâ€™s a new assignment in <strong>${escapeHtml(
                courseName
              )}</strong>.</p>
              ${
                primaryTimeValue
                  ? `<p style="margin:0 0 6px;color:#111111;"><strong>${primaryTimeLabel}:</strong> ${escapeHtml(
                      primaryTimeValue
                    )}</p>`
                  : ""
              }
              <p style="margin:0 0 12px;color:#111111;"><strong>Due date:</strong> ${escapeHtml(
                dueDateStr
              )}</p>
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
      `Thereâ€™s a new assignment in ${courseName}.`,
      primaryTimeValue ? `${primaryTimeLabel}: ${primaryTimeValue}` : "",
      `Due date: ${dueDateStr}`,
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
  async updateAssignmentMail(courseName: string, updated: any) {
    const subject = `Assignment updated: ${updated.name} - ${courseName}`;

    const scheduleDate = toDateOrUndefined(updated?.schedule);
    const updatedAtDate = toDateOrUndefined(updated?.updatedAt);
    const dueDateDate = toDateOrUndefined(updated?.dueDate);

    const scheduleStr =
      scheduleDate && !isEpoch1970(scheduleDate)
        ? formatBangkok(scheduleDate)
        : undefined;
    const updatedAtStr =
      updatedAtDate && !isEpoch1970(updatedAtDate)
        ? formatBangkok(updatedAtDate)
        : undefined;
    const dueDateStr =
      dueDateDate && !isEpoch1970(dueDateDate)
        ? formatBangkok(dueDateDate)
        : "(not set)";

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
              <p style="margin:0 8px 8px 0;color:#111111;">An assignment in <strong>${escapeHtml(
                courseName
              )}</strong> has been updated.</p>
              ${
                updatedAtStr
                  ? `<p style="margin:0 0 6px;color:#111111;"><strong>Updated at:</strong> ${escapeHtml(
                      updatedAtStr
                    )}</p>`
                  : ""
              }
              ${
                scheduleStr
                  ? `<p style="margin:0 0 6px;color:#111111;"><strong>Schedule:</strong> ${escapeHtml(
                      scheduleStr
                    )}</p>`
                  : ""
              }
              <p style="margin:0 0 12px;color:#111111;"><strong>Due date:</strong> ${escapeHtml(
                dueDateStr
              )}</p>
              <p style="margin:0 0 12px;color:#111111;"><strong>${escapeHtml(
                updated.name
              )}</strong></p>
              ${
                updated.description
                  ? `<p style="margin:0 0 12px;color:#111111;">${escapeHtml(
                      updated.description
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
</html>`

    const text = [
      subject,
      "",
      "Dear user,",
      "",
      `An assignment in ${courseName} has been updated.`,
      updatedAtStr ? `Updated at: ${updatedAtStr}` : "",
      scheduleStr ? `Schedule: ${scheduleStr}` : "",
      `Due date: ${dueDateStr}`,
      updated.name ? `\n${updated.name}` : "",
      updated.description ? `\n${updated.description}` : "",
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
