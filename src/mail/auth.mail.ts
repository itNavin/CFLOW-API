// email/authMail.ts
import { formatBangkok } from "src/util/time";

export const authMail = {
  async loginMail(
    name: string,
    opts?: { loginAt?: Date | string; locale?: string }
  ) {
    const when = formatBangkok(opts?.loginAt ?? new Date(), opts?.locale);
    const subject = `New login to your C-Flow account`;

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
                name
              )},</p>
              <p style="margin:0 0 12px;color:#111111;">We noticed a new login to your C-Flow account.</p>
              <p style="margin:0 0 12px;color:#111111;"><strong>Time:</strong> ${escapeHtml(
                when
              )}</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const text = `New login to your C-Flow account

Dear ${name},

We noticed a new login to your account.

Time: ${when}

Best regards,
C-Flow Team`;

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
