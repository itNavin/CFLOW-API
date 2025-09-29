// middleware/auth.ts
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

  // 1) Try to verify as a Solar JWT first (your own token for Sol# users)
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
      // Not a valid Solar token -> fall through to SSO path
    }
  }

  // 2) Treat as an SSO refresh token; refresh to get a fresh access token
  try {
    const refreshed = await refreshSSOToken(token);
    if (!refreshed.success || !refreshed.data) {
      return c.json({ message: "Unauthorized : invalid token" }, 401);
    }

    const access = refreshed.data.access_token;
    // Note: decode without verify; if you want to verify, add JWKS validation
    const accessPayload = jwt.decode(access) as {
      preferred_username: string;
      description: string;
    } | null;
    if (!accessPayload?.preferred_username || !accessPayload.description) {
      return c.json({ message: "Unauthorized: malformed SSO token" }, 401);
    }

    c.set("userId", accessPayload.preferred_username);
    c.set("role", accessPayload.description);

    // surface the new refresh token (and optionally access token) to the client
    c.header("X-Refresh-Token", refreshed.data.refresh_token);
    // c.header("X-Access-Token", access); // uncomment if you want to return access token too

    await next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      return c.json({ message: "Unauthorized: token expired" }, 401);
    }
    return c.json({ message: "Unauthorized: invalid token" }, 401);
  }
}
