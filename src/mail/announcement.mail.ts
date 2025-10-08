import { formatBangkok } from "src/util/time";
import { mailTemplates, escapeHtml } from "../mail/main.mail";

export const announcementMail = {
  async createAnnouncementMail(
    courseName: string,
    created: any,
    recipientName: string
  ) {
    const subject = `New announcement: ${created.name} — ${courseName}`;

    const scheduleDate = toDateOrUndefined(created?.schedule);
    const createdAtDate = toDateOrUndefined(created?.createdAt);
    const whenRaw =
      scheduleDate && !isEpoch1970(scheduleDate) ? scheduleDate : createdAtDate;
    const when = whenRaw ? formatBangkok(whenRaw) : undefined;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">There’s a new announcement in <strong>${escapeHtml(
      courseName
    )}</strong>.</p>
${
  when
    ? `<p style="margin:0 0 12px;color:#111111;"><strong>Created at:</strong> ${escapeHtml(
        when
      )}</p>`
    : ""
}
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
      preheader: `New announcement in ${courseName}`,
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      `There’s a new announcement in ${courseName}.`,
      when ? `Created at: ${when}` : "",
      created?.name ? `\n${created.name}` : "",
      created?.description ? `\n${created.description}` : "",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  async updateAnnouncementMail(
    courseName: string,
    updated: any,
    recipientName: string
  ) {
    const subject = `Announcement updated: ${updated.name} — ${courseName}`;

    const updatedAtDate = toDateOrUndefined(updated?.updatedAt);
    const when =
      updatedAtDate && !isEpoch1970(updatedAtDate)
        ? formatBangkok(updatedAtDate)
        : undefined;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">An announcement in <strong>${escapeHtml(
      courseName
    )}</strong> was updated.</p>
${
  when
    ? `<p style="margin:0 0 12px;color:#111111;"><strong>Updated at:</strong> ${escapeHtml(
        when
      )}</p>`
    : ""
}
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
      preheader: `Announcement updated in ${courseName}`,
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      `An announcement in ${courseName} was updated.`,
      when ? `Updated at: ${when}` : "",
      updated?.name ? `\n${updated.name}` : "",
      updated?.description ? `\n${updated.description}` : "",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  async deleteAnnouncementMail(
    userId: string,
    courseName: string,
    deleted: any,
    recipientName: string
  ) {
    const subject = `Announcement deleted: ${
      deleted?.name ?? "(untitled)"
    } — ${courseName}`;

    const deletedByName =
      String(deleted?.deletedByName ?? deleted?.deletedBy?.name ?? "") ||
      "Unknown";
    const deletedByEmail =
      String(deleted?.deletedByEmail ?? deleted?.deletedBy?.email ?? "") || "";

    const deletedAtDate =
      toDateOrUndefined(deleted?.deletedAt) ??
      toDateOrUndefined(deleted?.updatedAt) ??
      toDateOrUndefined(deleted?.createdAt);

    const when =
      deletedAtDate && !isEpoch1970(deletedAtDate)
        ? formatBangkok(deletedAtDate)
        : undefined;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">An announcement in <strong>${escapeHtml(
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
      deleted?.name ?? ""
    )}</strong></p>
${
  deleted?.description
    ? `<p style="margin:0 0 12px;color:#6b7280;">${escapeHtml(
        deleted.description
      )}</p>`
    : ""
}
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `Announcement deleted in ${courseName}`,
    });

    const deletedByText = `Deleted by: ${deletedByName}${
      deletedByEmail ? ` <${deletedByEmail}>` : ""
    }`;

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      `An announcement in ${courseName} was deleted.`,
      when ? `Deleted at: ${when}` : "",
      deletedByText,
      deleted?.name ? `\n${deleted.name}` : "",
      deleted?.description ? `\n${deleted.description}` : "",
      "",
      "Best regards,",
      "C-Flow Team",
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
