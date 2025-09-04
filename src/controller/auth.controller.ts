import { Role } from "@prisma/client";
import { prisma } from "../prisma";
import "dotenv/config";
import type { Context } from "hono";
import * as jwt from "jsonwebtoken";
import { loginSSO } from "src/lib/sso";
import { SsoAccessTokenPayload } from "src/types/sso";
import { AuthModel } from "src/model/auth.model";

const ROLE_MAP: Record<string, Role> = {
  student: "STUDENT",
  lecturer: "LECTURER",
  staff: "STAFF",
};

export function mapRole(raw: unknown): Role {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  const mapped = ROLE_MAP[v];
  if (mapped) return mapped;
  throw new Error(`Unsupported role: ${raw}`);
}

export const AuthController = {
  login: async (c: Context) => {
    const body = await c.req.json<{ username: string; password: string }>();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ message: "Username and password are required" }, 400);
    }

    try {
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
      
      try {
        await AuthModel.createUser({
          id: accessTokenPayload.preferred_username,
          email: accessTokenPayload.email,
          name: accessTokenPayload.name,
          role,
        });
      } catch (e) {
        if ((e as any)?.code !== "P2002") throw e;
        console.log("User already exists, skipping creation");
      }

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
    } catch (error) {
      console.error("Login failed:", error);
      return c.json({ message: "Login failed" }, 500);
    }
  },
  verify: async (c: Context) => {
    return c.json({ message: "Token is valid" }, 200);
  },
};
