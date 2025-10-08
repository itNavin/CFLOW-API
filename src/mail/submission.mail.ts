import { prisma } from "src/prisma";
import { formatBangkok } from "src/util/time";
import { mailTemplates, escapeHtml } from "./main.mail";

export const submissionMail = {
  createStudentSubmissionMail: async (
    assignment: any,
    groupId: string,
    groupName: string,
    submissionId: string,
    recipientName: string
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
        missed: true,
      },
    });
    if (!submission) throw new Error("Submission not found");

    const statusLabel = toTitleCase(submission.status.replace(/_/g, " "));
    const versionLabel = String(submission.version);

    const submittedAtDate = submission.submittedAt;
    const submittedAtStr = submittedAtDate
      ? formatBangkok(submittedAtDate)
      : "(not set)";

    const dueDateDate = pickValidDate(
      assignmentDueDate?.dueDate,
      assignment?.dueDate
    );
    const dueDateStr = dueDateDate ? formatBangkok(dueDateDate) : "(not set)";

    const subject = `Submission received — ${assignment.name}`;

    const timelinessLabel = submission.missed ? "LATE" : "ON TIME";
    const timelinessColor = submission.missed ? "#EF4444" : "#16A34A";
    const timelinessHtmlLine = `<p style="margin:0 0 6px;color:${timelinessColor};"><strong>${timelinessLabel} submission</strong></p>`;
    const timelinessTextLine = `${timelinessLabel} submission`;

    const statusColor =
      submission.status === "SUBMITTED" ? "#1D4ED8" : "#111111";
    const statusHtmlLine = `<p style="margin:0 0 4px;color:#111111;"><strong>Status:</strong> <span style="color:${statusColor};">${escapeHtml(
      statusLabel
    )}</span></p>`;
    const statusNoteHtml = `<p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.5;">Your submission was received successfully. Please wait for your lecturer’s review.</p>`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
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
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `Submission received — ${assignment.name}`,
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      `Assignment: ${assignment.name}`,
      `Due date: ${dueDateStr}`,
      timelinessTextLine,
      `Submitted at: ${submittedAtStr}`,
      `Group: ${groupName}`,
      `Version: ${versionLabel}`,
      `Status: ${statusLabel}`,
      "Note: Your submission was received successfully. Please wait for your lecturer’s review.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  createLecturerSubmissionMail: async (
    assignment: any,
    groupId: string,
    groupName: string,
    submissionId: string,
    recipientName: string 
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
        missed: true,
      },
    });
    if (!submission) throw new Error("Submission not found");

    const statusLabel = toTitleCase(submission.status.replace(/_/g, " "));
    const versionLabel = String(submission.version);

    const submittedAtDate = submission.submittedAt;
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

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
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
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `New submission — ${assignment.name}`,
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      `Assignment: ${assignment.name}`,
      `Due date: ${dueDateStr}`,
      `End date: ${endDateStr}`,
      timelinessTextLine,
      `Submitted at: ${submittedAtStr}`,
      `Group: ${groupName}`,
      `Version: ${versionLabel}`,
      `Status: ${statusLabel}`,
      "Note: Please review and provide feedback at your earliest convenience. The student may need to revise based on your comments.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },
};

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
