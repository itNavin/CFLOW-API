import { formatBangkok } from "src/util/time";
import { mailTemplates, escapeHtml } from "../mail/main.mail";

export const assignmentMail = {
  async createAssignmentMail(
    courseName: string,
    created: any,
    recipientName: string
  ) {
    const subject = `New assignment: ${created.name} — ${courseName}`;

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

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">There’s a new assignment in <strong>${escapeHtml(
      courseName
    )}</strong>.</p>
${
  primaryTimeValue
    ? `<p style="margin:0 0 6px;color:#111111;"><strong>${escapeHtml(
        primaryTimeLabel
      )}:</strong> ${escapeHtml(primaryTimeValue)}</p>`
    : ""
}
<p style="margin:0 0 12px;color:#111111;"><strong>Due date:</strong> ${escapeHtml(
      dueDateStr
    )}</p>
<p style="margin:0 0 12px;color:#111111;"><strong>${escapeHtml(
      created.name ?? ""
    )}</strong></p>
${
  created.description
    ? `<p style="margin:0 0 12px;color:#111111;">${escapeHtml(
        created.description
      )}</p>`
    : ""
}
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `New assignment in ${courseName}`,
    });

    const text = mailTemplates.textTemplate([
      `There’s a new assignment in ${courseName}.`,
      primaryTimeValue ? `${primaryTimeLabel}: ${primaryTimeValue}` : "",
      `Due date: ${dueDateStr}`,
      created?.name ? `\n${created.name}` : "",
      created?.description ? `\n${created.description}` : "",
    ]);

    return { subject, html, text };
  },

  async updateAssignmentMail(
    courseName: string,
    updated: any,
    recipientName: string
  ) {
    const subject = `Assignment updated: ${updated.name} — ${courseName}`;

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

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
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
      updated.name ?? ""
    )}</strong></p>
${
  updated.description
    ? `<p style="margin:0 0 12px;color:#111111;">${escapeHtml(
        updated.description
      )}</p>`
    : ""
}
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `Assignment updated in ${courseName}`,
    });

    const text = mailTemplates.textTemplate([
      `An assignment in ${courseName} has been updated.`,
      updatedAtStr ? `Updated at: ${updatedAtStr}` : "",
      scheduleStr ? `Schedule: ${scheduleStr}` : "",
      `Due date: ${dueDateStr}`,
      updated?.name ? `\n${updated.name}` : "",
      updated?.description ? `\n${updated.description}` : "",
    ]);

    return { subject, html, text };
  },

  async deleteAssignmentMail(
    courseName: string,
    deletedAssignment: {
      name?: string;
      dueDate?: Date | string;
      schedule?: Date | string;
      updatedAt?: Date | string;
      createdAt?: Date | string;
    },
    deleter: { name?: string; email?: string },
    recipientName: string
  ) {
    const subject = `Assignment deleted: ${
      deletedAssignment?.name ?? "(untitled)"
    } — ${courseName}`;

    const deletedAtDate =
      toDateOrUndefined((deletedAssignment as any)?.deletedAt) ??
      toDateOrUndefined(deletedAssignment?.updatedAt) ??
      toDateOrUndefined(deletedAssignment?.createdAt);
    const when =
      deletedAtDate && !isEpoch1970(deletedAtDate)
        ? formatBangkok(deletedAtDate)
        : undefined;

    const deletedByName = deleter?.name || "Unknown";
    const deletedByEmail = deleter?.email || "";

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">An assignment in <strong>${escapeHtml(
      courseName
    )}</strong> was deleted.</p>
${
  when
    ? `<p style="margin:0 0 12px;color:#111111;"><strong>Deleted at:</strong> ${escapeHtml(
        when
      )}</p>`
    : ""
}
<p style="margin:0 0 12px;color:#111111;"><strong>Deleted by:</strong> ${escapeHtml(
      deletedByName
    )}${deletedByEmail ? ` &lt;${escapeHtml(deletedByEmail)}&gt;` : ""}</p>
<p style="margin:0 0 12px;color:#6b7280;"><strong>${escapeHtml(
      deletedAssignment?.name ?? ""
    )}</strong></p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `Assignment deleted in ${courseName}`,
    });

    const text = mailTemplates.textTemplate([
      `An assignment in ${courseName} was deleted.`,
      when ? `Deleted at: ${when}` : "",
      `Deleted by: ${deletedByName}${
        deletedByEmail ? ` <${deletedByEmail}>` : ""
      }`,
      deletedAssignment?.name ? `\n${deletedAssignment.name}` : "",
    ]);

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
