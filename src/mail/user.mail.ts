export const userMail = {
  createSolarLecturerMail: async (
    payload: {
      user: { id: string; name: string; email: string };
      tempPassword: string;
      token: string; 
    },
    opts?: { frontendBaseUrl?: string }
  ) => {
    if (!payload?.user || !payload?.tempPassword || !payload?.token) {
      throw new Error(
        "createSolarLecturerMail requires { user, tempPassword, token }"
      );
    }

    const { user, tempPassword, token } = payload;
    const base = opts?.frontendBaseUrl ?? "http://localhost:3000";

    const updateLink = `${base}/solar/update-password?token=${encodeURIComponent(
      token
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
        <p>Please update your password immediately using the button below (link expires in 30 minutes):</p>
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

Update your password (link expires in 30 minutes):
${updateLink}

Best regards,
C-Flow Team`;

    return { subject, html, text };
  },
  resetLinkMail: async (
    payload: { user: { id: string; name: string; email: string }; token: string },
    opts?: { frontendBaseUrl?: string }
  ) => {
    if (!payload?.user || !payload?.token) {
      throw new Error("resetLinkMail requires { user, token }");
    }
    const { user, token } = payload;
    const base = opts?.frontendBaseUrl ?? "http://localhost:3000";
    const updateLink = `${base}/solar/update-password?token=${encodeURIComponent(token)}`;

    const subject = `C-Flow: Your new password reset link`;

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
        <h1 style="margin-bottom: 8px;">Password Reset Link</h1>
        <p>Hello <strong>${escapeHtml(user.name)}</strong> (${escapeHtml(user.id)}),</p>
        <p>Here is your new password reset link. It expires in 60 minutes:</p>
        <p><a href="${updateLink}" style="display:inline-block;padding:10px 16px;border-radius:6px;text-decoration:none;border:1px solid #000;">Update Password</a></p>
        <p style="color:#666;margin-top:16px">If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all">${updateLink}</span></p>
        <p>Best regards,<br/>C-Flow Team</p>
      </div>
    `;

    const text = `Password Reset Link

Hello ${user.name} (${user.id}),

Here is your new password reset link (expires in 60 minutes):
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
