// auth.middleware.ts
import type { Context, Next } from "hono";
import * as jwt from "jsonwebtoken";
import { getCookie } from "hono/cookie"; // bun add hono if not present

type AuthPayload = { userId: number; role: string };

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is missing");
  return secret;
}

export async function authMiddleware(c: Context, next: Next) {
  // 1) Read token from cookie
  // const token = getCookie(c, "auth");
  const AuthorizationHeader = c.req.header("Authorization");
  if (!AuthorizationHeader) {
    return c.json({ message: "Unauthorized: no Authorization header" }, 401);
  }
  if (!AuthorizationHeader.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized : invalid header format" }, 401);
  }
  const token = AuthorizationHeader.split(" ")[1];

  // if (!token) return c.json({ message: "Unauthorized: no cookie" }, 401);

  try {
    // 2) Verify with explicit algorithms
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    }) as AuthPayload;

    // 3) Attach to context
    c.set("userId", payload.userId);
    c.set("role", payload.role);

    await next();
  } catch (err: any) {
    // Optional: finer error messages
    if (err?.name === "TokenExpiredError") {
      return c.json({ message: "Unauthorized: token expired" }, 401);
    }
    return c.json({ message: "Unauthorized: invalid token" }, 401);
  }
}
