import { sendEmail } from "src/lib/mailer";
import type Mail from "nodemailer/lib/mailer";
import { prisma } from "src/prisma";

type BuiltMail = {
  subject: string;
  html: string;
  text: string;
  attachments?: Mail.Attachment[];
};
type SentResult = {
  to: string;
  subject: string;
  text: string;
  sendResult: any;
};

function isFulfilled<T>(
  r: PromiseSettledResult<T>
): r is PromiseFulfilledResult<T> {
  return r.status === "fulfilled";
}

export async function mailSentAndSummary(
  mailUsers: any[],
  subject: string,
  html: string,
  text: string
): Promise<void>;
export async function mailSentAndSummary(
  mailUsers: any[],
  build: (u: any) => Promise<BuiltMail> | BuiltMail
): Promise<void>;

export async function mailSentAndSummary(
  mailUsers: any[],
  arg2: any,
  arg3?: string,
  arg4?: string
) {
  const isBuilder = typeof arg2 === "function";
  const recipients: string[] = (mailUsers ?? [])
    .map((u: any) => u?.user?.email?.trim?.() || u?.email?.trim?.())
    .filter(Boolean);

  const results = await Promise.allSettled<SentResult>(
    (mailUsers ?? []).map(async (u: any, i: number) => {
      const to = recipients[i];
      if (!to) return Promise.reject(new Error("Missing recipient"));

      const mail: BuiltMail = isBuilder
        ? await arg2(u)
        : {
            subject: arg2 as string,
            html: arg3 as string,
            text: arg4 as string,
          };

      const sendResult = await sendEmail(to, mail.subject, mail.html, mail.text, {
        attachments: mail.attachments,
      });

      return { to, subject: mail.subject, text: mail.text, sendResult };
    })
  );

  const logs = (mailUsers ?? [])
    .map((u: any, i: number) => {
      const userId = u?.user?.id ?? u?.id;
      if (!userId) return null;

      const r = results[i];
      if (!r) return null;

      let title: string;
      let description: string;

      if (isFulfilled(r)) {
        title = r.value.subject;
        description = r.value.text.slice(0, 200); 
      } else {
        title = isBuilder ? arg2?.name ?? "Email" : (arg2 as string);
        description = "Email failed to send";
      }

      return { userId, title, description, createdAt: new Date() };
    })
    .filter(Boolean) as Array<{
    userId: string;
    title: string;
    description: string;
    createdAt: Date;
  }>;

  if (logs.length) {
    try {
      await prisma.activityLog.createMany({ data: logs });
    } catch (e) {
      console.error("[activityLog] createMany error:", e);
    }
  }

  console.log("email summary:", logs);
}
