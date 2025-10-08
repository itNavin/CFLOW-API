import { formatBangkok } from "src/util/time";
import { mailTemplates, escapeHtml } from "../mail/main.mail";

export const authMail = {
  async loginMail(
    name: string,
    opts?: { loginAt?: Date | string; locale?: string }
  ) {
    const when = formatBangkok(opts?.loginAt ?? new Date(), opts?.locale);
    const subject = `New login to your C-Flow account`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;color:#111111;">We noticed a new login to your C-Flow account.</p>
<p style="margin:0 0 12px;color:#111111;"><strong>Time:</strong> ${escapeHtml(
      when
    )}</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: "You have a new login to your C-Flow account.",
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${name},`,
      "",
      "We noticed a new login to your C-Flow account.",
      `Time: ${when}`,
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },
};
