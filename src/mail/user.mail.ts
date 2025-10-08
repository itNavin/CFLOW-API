import { Role } from "../types/role";
import { mailTemplates, escapeHtml } from "./main.mail"; 

type UserMailPayload = {
  user: {
    name: string;
    id: string;
    email: string;
    password: string | null;
    role: Role;
    program: "CS" | "DSI" | "BOTH";
    createdAt: Date;
  };
};

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

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(user.name)},</p>
<p style="margin:0 0 12px;color:#111111;">You have been registered as a <strong>Solar Lecturer</strong> in the C-Flow system.</p>

<div style="background:#f6f6f8;border:1px solid #eaeaea;border-radius:8px;padding:12px;margin:12px 0;">
  <p style="margin:0 4px 6px 0;color:#111111;"><strong>Username (ID):</strong> ${escapeHtml(
    user.id
  )}</p>
  <p style="margin:0 4px 0 0;color:#111111;"><strong>Temporary password:</strong> ${escapeHtml(
    tempPassword
  )}</p>
</div>

<p style="margin:0 0 12px;color:#111111;">Please update your password immediately using the button below (link expires in 60 minutes):</p>

<p style="margin:0 0 16px;">
  <a href="${updateLink}" style="display:inline-block;padding:10px 16px;border-radius:6px;border:1px solid #111;text-decoration:none;">Update Password</a>
</p>

<p style="color:#666;margin:0 0 12px;">If the button doesn't work, copy and paste this link into your browser:<br/>
  <span style="word-break:break-all">${escapeHtml(updateLink)}</span>
</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: "Welcome to C-Flow — set your password",
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${user.name},`,
      "",
      "You have been registered as a Solar Lecturer in the C-Flow system.",
      `Username (ID): ${user.id}`,
      `Temporary password: ${tempPassword}`,
      "",
      "Update your password (link expires in 60 minutes):",
      updateLink,
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  resetLinkMail: async (
    payload: {
      user: { id: string; name: string; email: string };
      token: string;
    },
    opts?: { frontendBaseUrl?: string }
  ) => {
    if (!payload?.user || !payload?.token) {
      throw new Error("resetLinkMail requires { user, token }");
    }
    const { user, token } = payload;
    const base = opts?.frontendBaseUrl ?? "http://localhost:3000";
    const updateLink = `${base}/solar/update-password?token=${encodeURIComponent(
      token
    )}`;

    const subject = `C-Flow: Your new password reset link`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(user.name)},</p>
<p style="margin:0 0 12px;color:#111111;">Here is your new password reset link. It expires in 60 minutes:</p>

<p style="margin:0 0 16px;">
  <a href="${updateLink}" style="display:inline-block;padding:10px 16px;border-radius:6px;border:1px solid #111;text-decoration:none;">Update Password</a>
</p>

<p style="color:#666;margin:0 0 12px;">If the button doesn't work, copy and paste this link into your browser:<br/>
  <span style="word-break:break-all">${escapeHtml(updateLink)}</span>
</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: "Password reset — link valid for 60 minutes",
    });

    const text = mailTemplates.textTemplate([
      "Password Reset Link",
      "",
      `Dear ${user.name},`,
      "",
      "Here is your new password reset link (expires in 60 minutes):",
      updateLink,
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  createStaffUserMail: async (mailUser: UserMailPayload) => {
    if (!mailUser?.user)
      throw new Error("createStaffUserMail requires { user }");

    const subject = `Welcome to C-Flow as a Staff Member`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(
      mailUser.user.name
    )},</p>
<p style="margin:0 0 12px;color:#111111;">You have been registered as a <strong>Staff Member</strong> in the C-Flow system.</p>

<div style="background:#f6f6f8;border:1px solid #eaeaea;border-radius:8px;padding:12px;margin:12px 0;">
  <p style="margin:0 4px 6px 0;color:#111111;"><strong>Username (ID):</strong> ${escapeHtml(
    mailUser.user.id
  )}</p>
  <p style="margin:0 4px 6px 0;color:#111111;"><strong>Email:</strong> ${escapeHtml(
    mailUser.user.email
  )}</p>
  <p style="margin:0 4px 0 0;color:#111111;"><strong>Name:</strong> ${escapeHtml(
    mailUser.user.name
  )}</p>
</div>

<p style="margin:0 0 12px;color:#111111;">Please log in to the system using your username (ID) and the email provided.</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: "Welcome to C-Flow — Staff account created",
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${mailUser.user.name},`,
      "",
      "Your Staff account has been created.",
      `Username (ID): ${mailUser.user.id}`,
      `Email: ${mailUser.user.email}`,
      `Name: ${mailUser.user.name}`,
      "",
      "Please log in using your username (ID) and email.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  createLecturerUserMail: async (mailUser: UserMailPayload) => {
    if (!mailUser?.user)
      throw new Error("createLecturerUserMail requires { user }");

    const subject = `Welcome to C-Flow as a Lecturer`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(
      mailUser.user.name
    )},</p>
<p style="margin:0 0 12px;color:#111111;">You have been registered as a <strong>Lecturer</strong> in the C-Flow system.</p>

<div style="background:#f6f6f8;border:1px solid #eaeaea;border-radius:8px;padding:12px;margin:12px 0;">
  <p style="margin:0 4px 6px 0;color:#111111;"><strong>Username (ID):</strong> ${escapeHtml(
    mailUser.user.id
  )}</p>
  <p style="margin:0 4px 6px 0;color:#111111;"><strong>Email:</strong> ${escapeHtml(
    mailUser.user.email
  )}</p>
  <p style="margin:0 4px 0 0;color:#111111;"><strong>Name:</strong> ${escapeHtml(
    mailUser.user.name
  )}</p>
</div>

<p style="margin:0 0 12px;color:#111111;">Please log in to the system using your username (ID) and the email provided.</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: "Welcome to C-Flow — Lecturer account created",
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${mailUser.user.name},`,
      "",
      "Your Lecturer account has been created.",
      `Username (ID): ${mailUser.user.id}`,
      `Email: ${mailUser.user.email}`,
      `Name: ${mailUser.user.name}`,
      "",
      "Please log in using your username (ID) and email.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },
};
