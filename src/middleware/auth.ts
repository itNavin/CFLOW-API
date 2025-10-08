import type { Context, Next } from "hono";
import * as jwt from "jsonwebtoken";
import { refreshSSOToken } from "src/lib/sso";

type SolarJwt = {
  sub: string;
  role: string;
  typ?: string;
  exp?: number;
  iat?: number;
};

export async function authMiddleware(c: Context, next: Next) {
  const auth = c.req.header("Authorization");
  if (!auth)
    return c.json({ message: "Unauthorized: no Authorization header" }, 401);
  if (!auth.startsWith("Bearer "))
    return c.json({ message: "Unauthorized : invalid header format" }, 401);

  const token = auth.slice("Bearer ".length).trim();

  const secret = process.env.JWT_SECRET;
  if (secret) {
    try {
      const payload = jwt.verify(token, secret) as SolarJwt;
      if ((payload.typ ?? "").toLowerCase() === "solar") {
        c.set("userId", payload.sub);
        c.set("role", payload.role);
        return await next();
      }
    } catch {
    }
  }

  try {
    const refreshed = await refreshSSOToken(token);
    if (!refreshed.success || !refreshed.data) {
      return c.json({ message: "Unauthorized : invalid token" }, 401);
    }

    const access = refreshed.data.access_token;
    const accessPayload = jwt.decode(access) as {
      preferred_username: string;
      description: string;
    } | null;
    if (!accessPayload?.preferred_username || !accessPayload.description) {
      return c.json({ message: "Unauthorized: malformed SSO token" }, 401);
    }

    c.set("userId", accessPayload.preferred_username);
    c.set("role", accessPayload.description);

    c.header("X-Refresh-Token", refreshed.data.refresh_token);

    await next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      return c.json({ message: "Unauthorized: token expired" }, 401);
    }
    return c.json({ message: "Unauthorized: invalid token" }, 401);
  }
}
