// src/mail/submission.mail.ts
import { prisma } from "src/prisma";
import { formatBangkok } from "src/util/time";

export const submissionMail = {
  createStudentSubmissionMail: async (
    assignment: any,
    groupId: string,
    groupName: string,
    submissionId: string
  ) => {
    const assignmentDueDate = await prisma.assignmentDueDate.findUnique({
      where: { assignmentId_groupId: { assignmentId: assignment.id, groupId } },
      select: { dueDate: true },
    });

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        status: true,
        version: true,
        submittedAt: true,
        missed: true, // <-- include missed
      },
    });
    if (!submission) throw new Error("Submission not found");

    const statusLabel = toTitleCase(submission.status.replace(/_/g, " "));
    const versionLabel = String(submission.version);

    const submittedAtDate = submission.submittedAt ?? submission.submittedAt;
    const submittedAtStr = submittedAtDate
      ? formatBangkok(submittedAtDate)
      : "(not set)";

    const dueDateDate = pickValidDate(
      assignmentDueDate?.dueDate,
      assignment?.dueDate
    );
    const dueDateStr = dueDateDate ? formatBangkok(dueDateDate) : "(not set)";

    const subject = `Submission received — ${assignment.name}`;

    // Status color: only SUBMITTED (student)
    const statusColor =
      submission.status === "SUBMITTED" ? "#1D4ED8" : "#111111";
    const statusHtmlLine = `<p style="margin:0 0 4px;color:#111111;"><strong>Status:</strong> <span style="color:${statusColor};">${escapeHtml(
      statusLabel
    )}</span></p>`;
    const statusNoteHtml = `<p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.5;">Your submission was received successfully. Please wait for your lecturer’s review.</p>`;

    // Missed/On-time line (shown above Submitted at)
    const timelinessLabel = submission.missed ? "LATE" : "ON TIME";
    const timelinessColor = submission.missed ? "#EF4444" : "#16A34A";
    const timelinessHtmlLine = `<p style="margin:0 0 6px;color:${timelinessColor};"><strong>${timelinessLabel} submission</strong></p>`;
    const timelinessTextLine = `${timelinessLabel} submission`;

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
              <p style="margin:0 0 12px;color:#111111;">Your submission for <strong>${escapeHtml(
                assignment.name
              )}</strong> has been received.</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Due date:</strong> ${escapeHtml(
                dueDateStr
              )}</p>
              ${timelinessHtmlLine}
              <p style="margin:0 0 6px;color:#111111;"><strong>Submitted at:</strong> ${escapeHtml(
                submittedAtStr
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Group:</strong> ${escapeHtml(
                groupName
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Version:</strong> ${escapeHtml(
                versionLabel
              )}</p>
              ${statusHtmlLine}
              ${statusNoteHtml}
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
      `Assignment: ${assignment.name}`,
      `Due date: ${dueDateStr}`,
      `${timelinessTextLine}`,
      `Submitted at: ${submittedAtStr}`,
      `Group: ${groupName}`,
      `Version: ${versionLabel}`,
      `Status: ${statusLabel}`,
      "Note: Your submission was received successfully. Please wait for your lecturer’s review.",
      "",
      "Best regards,",
      "C-Flow Team",
    ].join("\n");

    return { subject, html, text };
  },

  createLecturerSubmissionMail: async (
    assignment: any,
    groupId: string,
    groupName: string,
    submissionId: string
  ) => {
    const assignmentDueDate = await prisma.assignmentDueDate.findUnique({
      where: { assignmentId_groupId: { assignmentId: assignment.id, groupId } },
      select: { dueDate: true },
    });

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        status: true,
        version: true,
        submittedAt: true,
        missed: true, // <-- include missed
      },
    });
    if (!submission) throw new Error("Submission not found");

    const statusLabel = toTitleCase(submission.status.replace(/_/g, " "));
    const versionLabel = String(submission.version);

    const submittedAtDate = submission.submittedAt ?? submission.submittedAt;
    const submittedAtStr = submittedAtDate
      ? formatBangkok(submittedAtDate)
      : "(not set)";

    const dueDateDate = pickValidDate(
      assignmentDueDate?.dueDate,
      assignment?.dueDate
    );
    const dueDateStr = dueDateDate ? formatBangkok(dueDateDate) : "(not set)";

    const endDateDate = pickValidDate(assignment?.endDate);
    const endDateStr = endDateDate ? formatBangkok(endDateDate) : "(not set)";

    const subject = `New submission — ${assignment.name}`;

    const timelinessLabel = submission.missed ? "LATE" : "ON TIME";
    const timelinessColor = submission.missed ? "#EF4444" : "#16A34A";
    const timelinessHtmlLine = `<p style="margin:0 0 6px;color:${timelinessColor};"><strong>${timelinessLabel} submission</strong></p>`;
    const timelinessTextLine = `${timelinessLabel} submission`;

    const statusHtmlLine = `<p style="margin:0 0 4px;color:#111111;"><strong>Status:</strong> ${escapeHtml(
      statusLabel
    )}</p>`;
    const statusNoteHtml = `<p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.5;">Please review and provide feedback at your earliest convenience. The student may need to revise based on your comments.</p>`;

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
              <p style="margin:0 0 12px;color:#111111;">A new submission was made for <strong>${escapeHtml(
                assignment.name
              )}</strong>.</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Due date:</strong> ${escapeHtml(
                dueDateStr
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>End date:</strong> ${escapeHtml(
                endDateStr
              )}</p>
              ${timelinessHtmlLine}
              <p style="margin:0 0 6px;color:#111111;"><strong>Submitted at:</strong> ${escapeHtml(
                submittedAtStr
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Group:</strong> ${escapeHtml(
                groupName
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Version:</strong> ${escapeHtml(
                versionLabel
              )}</p>
              ${statusHtmlLine}
              ${statusNoteHtml}
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
      `Assignment: ${assignment.name}`,
      `Due date: ${dueDateStr}`,
      `End date: ${endDateStr}`,
      `${timelinessTextLine}`,
      `Submitted at: ${submittedAtStr}`,
      `Group: ${groupName}`,
      `Version: ${versionLabel}`,
      `Status: ${statusLabel}`,
      "Note: Please review and provide feedback at your earliest convenience. The student may need to revise based on your comments.",
      "",
      "Best regards,",
      "C-Flow Team",
    ].join("\n");

    return { subject, html, text };
  },
};

// helpers
function pickValidDate(
  ...candidates: Array<Date | string | undefined>
): Date | undefined {
  for (const c of candidates) {
    const d = toDateOrUndefined(c);
    if (d && !isEpoch1970(d)) return d;
  }
  return undefined;
}
function toDateOrUndefined(v: unknown): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v as any);
  return isNaN(d.getTime()) ? undefined : d;
}
function isEpoch1970(d: Date): boolean {
  return d.getFullYear() === 1970 || d.getUTCFullYear() === 1970;
}
function toTitleCase(s: string) {
  return s.replace(
    /\w\S*/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}
function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
