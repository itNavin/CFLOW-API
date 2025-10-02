import { sendEmail } from "src/lib/mailer";
import { prisma } from "src/prisma";

export const mailSentAndSummary = async (
  mailUsers: any[],
  subject: string,
  html: string,
  text: string
) => {
  const recipients: string[] = (mailUsers ?? [])
    .map((u: any) => u?.user?.email?.trim() || u?.email?.trim())
    .filter(Boolean);

  const results = await Promise.allSettled(
    recipients.map((to) => sendEmail(to, subject, html, text))
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
    {
      sent: [] as string[],
      failed: [] as Array<{ to: string; error: string }>,
    }
  );

  const logs = (mailUsers ?? [])
    .map((u: any) => ({
      userId: u?.user?.id ?? u?.id, // supports both shapes
      title: subject,
      description: text,
      createdAt: new Date(),
    }))
    .filter((l) => !!l.userId); // keep only rows with a userId

  if (logs.length) {
    try {
      await prisma.activityLog.createMany({ data: logs });
    } catch (e) {
      console.error("[activityLog] createMany error:", e);
      // don't throw—email summary should still return
    }
  }
  // --- END NEW ---

  console.log("email summary:", summary);
};
