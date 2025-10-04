import { Hono } from "hono";
import { AuthController } from "../controller/auth.controller";
import { UserController, verifyResetTokenAndGetUserId  } from "../controller/user.controller";
import { authMiddleware } from "src/middleware/auth";
import { prisma } from "src/prisma";

export const authRouter = new Hono();

authRouter.post("/login", AuthController.login);
authRouter.get("/verify", authMiddleware, AuthController.verify);
authRouter.post("/update-solar-password", UserController.updateSolarPassword);
authRouter.get("/verify-reset-token", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ valid: false }, 400);

  try {
    // verify + get userId from your existing helper
    const userId = await verifyResetTokenAndGetUserId(token);

    // fetch basic user info to show on the page
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) return c.json({ valid: false }, 200);

    return c.json({ valid: true, user }, 200);
  } catch {
    return c.json({ valid: false }, 200);
  }
});

authRouter.post(
  "/resend-reset-link",
  AuthController.refreshTokenUpdatePassword
);