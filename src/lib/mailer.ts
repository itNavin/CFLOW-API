import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import fs from "node:fs";
import path from "node:path";
import { MAIL_SIT_LOGO_CID, MAIL_CFLOW_LOGO_CID } from "src/mail/main.mail";

const {
  SMTP_HOST,
  SMTP_PORT = "587",
  SMTP_SECURE = "false",
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM, 
} = process.env;

if (!SMTP_HOST) throw new Error("SMTP_HOST is missing");
if (!MAIL_FROM || !MAIL_FROM.includes("@")) {
  throw new Error("MAIL_FROM is missing or invalid (must be an email)");
}

console.log(
  "[mailer] host:",
  SMTP_HOST,
  "port:",
  SMTP_PORT,
  "secure:",
  SMTP_SECURE,
  "from:",
  MAIL_FROM
);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true", 
  auth:
    SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  // logger: true,
  // debug: true,
});

const inlineImageConfigs = [
  { filename: "SIT-LOGO.png", cid: MAIL_SIT_LOGO_CID },
  { filename: "C-FLOW-LOGO.png", cid: MAIL_CFLOW_LOGO_CID },
] as const;

const inlineLogoAttachments: Mail.Attachment[] = inlineImageConfigs
  .map(({ filename, cid }) => {
    const filePath = path.resolve(process.cwd(), "src", "assets", filename);
    if (!fs.existsSync(filePath)) {
      console.warn("[mailer] Inline logo not found at", filePath);
      return null;
    }
    return {
      filename,
      path: filePath,
      cid,
      contentDisposition: "inline",
    } satisfies Mail.Attachment;
  })
  .filter(Boolean) as Mail.Attachment[];

(async () => {
  try {
    await transporter.verify();
    console.log("[mailer] transporter.verify(): OK");
  } catch (e) {
    console.error("[mailer] transporter.verify() FAILED:", e);
  }
})();

type SendEmailOptions = {
  attachments?: Mail.Attachment[];
};

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  options?: SendEmailOptions
) {
  const from = `"C-Flow" <${MAIL_FROM}>`; 

  const attachments: Mail.Attachment[] = [
    ...inlineLogoAttachments,
    ...(options?.attachments ?? []),
  ];

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
      attachments: attachments.length ? attachments : undefined,
      envelope: {
        from: MAIL_FROM, 
        to,
      },
    });

    console.log(
      "[mailer] accepted:",
      info.accepted,
      "rejected:",
      info.rejected,
      "response:",
      info.response,
      "envelope:",
      info.envelope
    );
    return info;
  } catch (err) {
    console.error("[mailer] send error:", err);
    throw err;
  }
}
