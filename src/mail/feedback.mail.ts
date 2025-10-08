import { prisma } from "src/prisma";
import { formatBangkok } from "src/util/time";

export const feedbackMail = {
  createStudentFeedbackMail: async (
    assignmentName: string,
    projectName: string,
    submissionId: string,
    _lecturerId: string
  ) => {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        status: true,
        version: true,
        assignmentId: true,
        groupId: true,
      },
    });
    if (!submission) throw new Error("Submission not found");

    const latestFeedback = await prisma.feedback.findFirst({
      where: { submissionId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const assignmentRow = await prisma.assignment.findUnique({
      where: { id: submission.assignmentId },
      select: { dueDate: true },
    });

    const groupDue = await prisma.assignmentDueDate.findUnique({
      where: {
        assignmentId_groupId: {
          assignmentId: submission.assignmentId,
          groupId: submission.groupId,
        },
      },
      select: { dueDate: true },
    });

    const lecturer = await prisma.user.findUnique({
      where: { id: _lecturerId },
      select: { name: true },
    });

    const showDueDate = submission.status !== "FINAL";
    const dueDate = showDueDate
      ? pickValidDate(groupDue?.dueDate, assignmentRow?.dueDate)
      : null;

    const dueDateStr = dueDate ? formatBangkok(dueDate) : "(not set)";
    const feedbackDateStr = latestFeedback
      ? formatBangkok(latestFeedback.createdAt)
      : "(not set)";

    const {
      label: statusLabelRaw,
      colorHex,
      studentNote,
    } = getStatusMeta(submission.status);
    const statusLabel = toTitleCase(statusLabelRaw.replace(/_/g, " "));
    const versionLabel = String(submission.version);

    const subject = `New feedback — ${assignmentName}`;

    const dueDateHtmlLine = showDueDate
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Due date:</strong> ${escapeHtml(
          dueDateStr
        )}</p>`
      : "";

    const dueDateTextLine = showDueDate ? `Due date: ${dueDateStr}` : "";

    const statusHtmlLine = `<p style="margin:0 0 4px;color:#111111;"><strong>Status:</strong> <span style="color:${colorHex};">${escapeHtml(
      statusLabel
    )}</span></p>`;

    const statusStudentNoteHtml = studentNote?.trim()
      ? `<p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.5;">${escapeHtml(
          studentNote
        )}</p>`
      : "";

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
              <p style="margin:0 0 6px;color:#111111;">You have received new feedback from <strong>${escapeHtml(
                lecturer?.name ?? "your lecturer"
              )}</strong> for the assignment <strong>"${escapeHtml(
      assignmentName
    )}"</strong></p>
              ${dueDateHtmlLine}
              <p style="margin:0 0 6px;color:#111111;"><strong>Feedback date:</strong> ${escapeHtml(
                feedbackDateStr
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Group:</strong> ${escapeHtml(
                projectName
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Version:</strong> ${escapeHtml(
                versionLabel
              )}</p>
              ${statusHtmlLine}
              ${statusStudentNoteHtml}
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const textLines = [
      subject,
      "",
      "Dear user,",
      "",
      `Assignment: ${assignmentName}`,
      dueDateTextLine,
      `Feedback date: ${feedbackDateStr}`,
      `Group: ${projectName}`,
      `Version: ${versionLabel}`,
      `Status: ${statusLabel}`,
      studentNote?.trim() ? `Note: ${studentNote}` : "",
      "",
      "Best regards,",
      "C-Flow Team",
    ].filter(Boolean);

    const text = textLines.join("\n");

    return { subject, html, text };
  },

  createLecturerFeedbackMail: async (
    assignmentName: string,
    projectName: string,
    submissionId: string,
    lecturerId: string
  ) => {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        status: true,
        version: true,
        assignmentId: true,
        groupId: true,
      },
    });
    if (!submission) throw new Error("Submission not found");

    const lecturer = await prisma.user.findUnique({
      where: { id: lecturerId },
      select: { name: true },
    });

    const latestFeedback = await prisma.feedback.findFirst({
      where: { submissionId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const assignmentRow = await prisma.assignment.findUnique({
      where: { id: submission.assignmentId },
      select: { dueDate: true, endDate: true },
    });

    const groupDue = await prisma.assignmentDueDate.findUnique({
      where: {
        assignmentId_groupId: {
          assignmentId: submission.assignmentId,
          groupId: submission.groupId,
        },
      },
      select: { dueDate: true },
    });

    const dueDate = pickValidDate(groupDue?.dueDate, assignmentRow?.dueDate);
    const dueDateStr = dueDate ? formatBangkok(dueDate) : "(not set)";

    const endDate = pickValidDate(assignmentRow?.endDate);
    const endDateStr = endDate ? formatBangkok(endDate) : "(not set)";

    const feedbackDateStr = latestFeedback
      ? formatBangkok(latestFeedback.createdAt)
      : "(not set)";

    const { label: statusLabelRaw, colorHex } = getStatusMeta(
      submission.status
    );
    const statusLabel = toTitleCase(statusLabelRaw.replace(/_/g, " "));
    const versionLabel = String(submission.version);

    const subject = `Feedback received — ${assignmentName}`;

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
                lecturer?.name ?? "user"
              )},</p>
              <p style="margin:0 0 6px;color:#111111;">Your feedback for the assignment <strong>"${escapeHtml(
                assignmentName
              )}"</strong> has been recorded</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Due date:</strong> ${escapeHtml(
                dueDateStr
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>End date:</strong> ${escapeHtml(
                endDateStr
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Feedback date:</strong> ${escapeHtml(
                feedbackDateStr
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Group:</strong> ${escapeHtml(
                projectName
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Version:</strong> ${escapeHtml(
                versionLabel
              )}</p>
              <p style="margin:0 0 12px;color:#111111;"><strong>Status:</strong> <span style="color:${colorHex};">${escapeHtml(
      statusLabel
    )}</span></p>
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
      `Dear ${lecturer?.name ?? "user"},`,
      "",
      `Assignment: ${assignmentName}`,
      `Due date: ${dueDateStr}`,
      `End date: ${endDateStr}`,
      `Feedback date: ${feedbackDateStr}`,
      `Group: ${projectName}`,
      `Version: ${versionLabel}`,
      `Status: ${statusLabel}`,
      "",
      "Best regards,",
      "C-Flow Team",
    ].join("\n");

    return { subject, html, text };
  },
};

function getStatusMeta(raw: string): {
  label: string;
  colorHex: string;
  studentNote?: string;
} {
  const s = String(raw).trim().toUpperCase();
  if (s === "FINAL") {
    return {
      label: "FINAL",
      colorHex: "#16A34A",
      studentNote:
        "This is the final version approved by your lecturer. You don’t need to submit any more revisions.",
    };
  }
  if (s === "APPROVED_WITH_FEEDBACK" || s === "APPROVE_WITH_FEEDBACK") {
    return {
      label: "APPROVED_WITH_FEEDBACK",
      colorHex: "#10B981", 
      studentNote:
        "Please submit one last time to finalize. The next submission will be marked as FINAL; no further feedback will be provided.",
    };
  }
  if (s === "REJECTED") {
    return {
      label: "REJECTED",
      colorHex: "#EF4444", 
      studentNote:
        "Your submission was rejected. Please resubmit. Your lecturer will provide feedback to help you improve.",
    };
  }
  return {
    label: s,
    colorHex: "#374151", 
    studentNote: "",
  };
}

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
