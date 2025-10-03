export const userMail = {
  createSolarLecturerMail: async (
    createSolarLecturerUser: any,
    opts?: { frontendBaseUrl?: string }
  ) => {
    const { user, tempPassword } = createSolarLecturerUser;
    const base = opts?.frontendBaseUrl ?? "http://localhost:3000";

    const updateLink = `${base}/solar/update-password?userId=${encodeURIComponent(
      user.id
    )}`;

    const subject = `Welcome to C-Flow as a Solar Lecturer`;

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
        <h1 style="margin-bottom: 8px;">Welcome to C-Flow</h1>
        <p>You have been registered as a <strong>Solar Lecturer</strong> in the C-Flow system.</p>
        <div style="background:#f6f8fa;padding:12px;border-radius:8px;margin:16px 0">
          <p style="margin:0"><strong>Username (ID):</strong> ${escapeHtml(
            user.id
          )}</p>
          <p style="margin:0"><strong>Temporary password:</strong> ${escapeHtml(
            tempPassword
          )}</p>
        </div>
        <p>Please update your password immediately using the button below:</p>
        <p>
          <a href="${updateLink}" style="display:inline-block;padding:10px 16px;border-radius:6px;
             text-decoration:none;border:1px solid #000;">Update Password</a>
        </p>
        <p style="color:#666;margin-top:16px">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <span style="word-break:break-all">${updateLink}</span>
        </p>
        <p>Best regards,<br/>C-Flow Team</p>
      </div>
    `;

    const text = `Welcome to C-Flow as a Solar Lecturer

You have been registered as a Solar Lecturer in the C-Flow system.

Username (ID): ${user.id}
Temporary password: ${tempPassword}

Update your password now:
${updateLink}

Best regards,
C-Flow Team`;

    return { subject, html, text };
  },
};

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
