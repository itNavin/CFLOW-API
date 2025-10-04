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

debugRouter.post("/mail-debug", async (c) => {
  const { to } = await c.req.json().catch(() => ({ to: null }));
  if (!to) return c.json({ error: "to required" }, 400);
  try {
    const info = await sendEmail(to, "Debug test", "<b>Hello</b>", "Hello");
    return c.json(
      {
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      },
      200
    );
  } catch (e: any) {
    return c.json({ error: String(e?.message ?? e) }, 500);
  }
});

