import { sendEmail } from "src/lib/mailer";
import { prisma } from "src/prisma";

type BuiltMail = { subject: string; html: string; text: string };

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

  const results = await Promise.allSettled(
    (mailUsers ?? []).map(async (u: any, i: number) => {
      const to = recipients[i];
      if (!to) return;

      const mail: BuiltMail = isBuilder
        ? await arg2(u) 
        : {
            subject: arg2 as string,
            html: arg3 as string,
            text: arg4 as string,
          };

      return sendEmail(to, mail.subject, mail.html, mail.text);
    })
  );

  const summary = results.reduce(
    (acc, r, i) => {
      if (r.status === "fulfilled") acc.sent.push(recipients[i]);
      else
        acc.failed.push({
          to: recipients[i],
          error: String((r as PromiseRejectedResult).reason),
        });
      return acc;
    },
    { sent: [] as string[], failed: [] as Array<{ to: string; error: string }> }
  );

  const logs = (mailUsers ?? [])
    .map((u: any, i: number) => {
      const userId = u?.user?.id ?? u?.id;
      if (!userId) return null;

      const subj =
        isBuilder && results[i].status === "fulfilled"
          ? (results[i] as PromiseFulfilledResult<any>).value?.envelope
              ?.subject ??
            arg2?.name ??
            "Email" 
          : (arg2 as string);

      const description = isBuilder
        ? "Email sent" 
        : (arg4 as string);

      return { userId, title: subj, description, createdAt: new Date() };
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

  console.log("email summary:", summary);
}
