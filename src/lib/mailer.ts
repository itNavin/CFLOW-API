// src/lib/mailer.ts
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

console.log(
  "[mailer] host:",
  SMTP_HOST,
  "port:",
  SMTP_PORT,
  "secure:",
  SMTP_SECURE
);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true",
  auth:
    SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
) {
  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    console.log("[mailer] sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("[mailer] send error:", err);
    throw err;
  }
}
