import { Role } from "@prisma/client";
import { prisma } from "../prisma";
import "dotenv/config";
import type { Context } from "hono";
import * as jwt from "jsonwebtoken";
import { loginSSO } from "src/lib/sso";
import { SsoAccessTokenPayload } from "src/types/sso";
import bcrypt from "bcryptjs"; 
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";
import { authMail } from "src/mail/auth.mail";

const ROLE_MAP: Record<string, Role> = {
  student: "student",
  lecturer: "lecturer",
  staff: "staff",
};

export function mapRole(raw: unknown): Role {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  const mapped = ROLE_MAP[v];
  if (mapped) return mapped;
  throw new Error(`Unsupported role: ${raw}`);
}

function isBcryptHash(h: string) {
  return /^\$2[aby]\$/.test(h);
}
function isArgon2idHash(h: string) {
  return /^\$argon2id\$/.test(h);
}

export const AuthController = {
  login: async (c: Context) => {
    const body = await c.req.json<{ username: string; password: string }>();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ message: "Username and password are required" }, 400);
    }

    try {
      if (username.startsWith("Sol#")) {
        const user = await(async () => {
          return prisma.user.findUnique({
            where: { id: username },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              password: true,
            },
          });
        })();

        if (!user || !user.password) {
          return c.json({ message: "Invalid credentials" }, 401);
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          return c.json({ message: "Invalid credentials" }, 401);
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return c.json(
            { message: "Server misconfiguration: JWT_SECRET missing" },
            500
          );
        }

        const token = jwt.sign(
          { sub: user.id, role: user.role, typ: "solar" },
          secret,
          { expiresIn: "7d" }
        );

        //mail for solar login
        // const mailUser = await mailRoles.getSingleUser(user.id);
        const mailUser = await mailRoles.test(user.id);
        const {subject, html, text} = await authMail.loginMail(user.name);
        mailSentAndSummary(mailUser, subject, html, text);

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
      } else {
        const ssoResponse = await loginSSO(username, password);

        if (!ssoResponse.success || !ssoResponse.data) {
          return c.json({ message: "Invalid credentials" }, 401);
        }

        const accessTokenPayload = jwt.decode(
          ssoResponse.data.access_token
        ) as SsoAccessTokenPayload;

        const role = mapRole(
          (accessTokenPayload as any).role ?? accessTokenPayload.description
        );
        //mail 
        //const mailUser = await mailRoles.getSingleUser(accessTokenPayload.preferred_username);
        const mailUser = await mailRoles.test2(accessTokenPayload.preferred_username);
        const {subject, html, text} = await authMail.loginMail(accessTokenPayload.name);
        mailSentAndSummary(mailUser, subject, html, text);

        return c.json({
          message: "Login successful",
          token: ssoResponse.data.refresh_token,
          user: {
            id: accessTokenPayload.preferred_username,
            email: accessTokenPayload.email,
            role: accessTokenPayload.description,
            name: accessTokenPayload.name,
          },
        });
      }
      
    } catch (error) {
      console.error("Login failed:", error);
      return c.json({ message: "Login failed" }, 500);
    }
  },
  verify: async (c: Context) => {
    return c.json({ message: "Token is valid" }, 200);
  },
};
