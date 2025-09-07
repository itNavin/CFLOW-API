import type { Context, Next } from "hono";
import * as jwt from "jsonwebtoken";
import { refreshSSOToken } from "src/lib/sso";

type AuthPayload = { userId: number; role: string };

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is missing");
  return secret;
}

export async function authMiddleware(c: Context, next: Next) {
  // 1) Read token from cookie
  const AuthorizationHeader = c.req.header("Authorization");
  if (!AuthorizationHeader) {
    return c.json({ message: "Unauthorized: no Authorization header" }, 401);
  }
  if (!AuthorizationHeader.startsWith("Bearer ")) {
    return c.json({ message: "Unauthorized : invalid header format" }, 401);
  }
  const token = AuthorizationHeader.split(" ")[1];

  try {
    const refreshSsoResponse = await refreshSSOToken(token);
    if (!refreshSsoResponse.success || !refreshSsoResponse.data) {
      return c.json({ message: "Unauthorized : invalid token" }, 401);
    }
    const accessTokenPayload = jwt.decode(
      refreshSsoResponse.data.access_token
    ) as { preferred_username: string; description: string };
    c.set("userId", accessTokenPayload.preferred_username);
    c.set("role", accessTokenPayload.description);

    c.header("X-Refresh-Token", refreshSsoResponse.data.refresh_token);

    await next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      return c.json({ message: "Unauthorized: token expired" }, 401);
    }
    return c.json({ message: "Unauthorized: invalid token" }, 401);
  }
}
