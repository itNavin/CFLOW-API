import { Hono } from "hono";
import { sendEmail } from "../lib/mailer";

export const debugRouter = new Hono();

debugRouter.get("/send-test", async (c) => {
  try {
    const info = await sendEmail(
      "ITdansaikul@gmail.com",
      "Test Email",
      "<h1>Hello from Bun + Hono</h1><p>This is a test email.</p>",
      "Hello from Bun + Hono"
    );
    return c.json({
      message: "Email sent (queued to provider)",
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response, 
      envelope: info.envelope, 
    });
  } catch (err: any) {
    return c.json({ error: String(err?.message || err) }, 500);
  }
});

