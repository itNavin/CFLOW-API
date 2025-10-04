// mailer.ts
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT = "587",
  SMTP_SECURE = "false",
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
} = process.env;

if (!SMTP_HOST) throw new Error("SMTP_HOST is missing");
if (!MAIL_FROM) throw new Error("MAIL_FROM is missing");

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true", // false for STARTTLS on 587
  auth:
    SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  logger: true, // <-- verbose logs to console
  debug: true, // <-- include SMTP traffic
});

// call this once at startup
(async () => {
  try {
    await transporter.verify();
    console.log("[mailer] transporter.verify(): OK");
  } catch (e) {
    console.error("[mailer] transporter.verify() FAILED:", e);
  }
})();

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
) {
  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM, // must be a real mailbox on the SMTP domain
      to,
      subject,
      html,
      text,
      envelope: {
        from: MAIL_FROM, // sets Return-Path; align with MAIL_FROM
        to,
      },
      // replyTo: "no-reply@yourdomain"     // optional
    });
    console.log(
      "[mailer] accepted:",
      info.accepted,
      "rejected:",
      info.rejected,
      "response:",
      info.response
    );
    return info;
  } catch (err) {
    console.error("[mailer] send error:", err);
    throw err;
  }
}
