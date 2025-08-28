import { prisma } from "../../prisma";
import type { Context } from "hono";
import * as jwt from "jsonwebtoken";
import { AuthPayload } from "../../types/payload/auth.type"

export const LoginController = {
  login: async (c: Context) => {
    const body = await c.req.json();
    const { email, passwordHash } = body as {
      email?: string;
      passwordHash?: string;
    };

    if (!email || !passwordHash) {
      return c.json({ message: "Email and password are required" }, 400);
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return c.json({ message: "Invalid email or password" }, 401);
      }

      if (user.passwordHash !== passwordHash) {
        return c.json({ message: "Invalid email or password" }, 401);
      }

      //Sign JWT
      const payload: AuthPayload.Auth = { userId: user.id, role: user.role };
      const secret = process.env.JWT_SECRET || "";
      if (!secret) {
        return c.json(
          { message: "Server config error: missing JWT_SECRET" },
          500
        );
      }

      const expiresIn = (process.env.JWT_EXPIRES_IN ||
        "1h") as jwt.SignOptions["expiresIn"];
      const token = jwt.sign(payload, secret, {
        expiresIn,
        algorithm: "HS256",
      });

      return c.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
      });
    } catch (error) {
      console.error("Login failed:", error);
      return c.json({ message: "Login failed" }, 500);
    }
  },
};
