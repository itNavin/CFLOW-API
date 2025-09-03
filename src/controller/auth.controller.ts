import { Role } from "@prisma/client";
import { prisma } from "../prisma";
import "dotenv/config";
import type { Context } from "hono";
import * as jwt from "jsonwebtoken";
import { loginSSO } from "src/lib/sso";
import { SsoAccessTokenPayload } from "src/types/sso";
import { AuthModel } from "src/model/auth.model";

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
      
      try {
        AuthModel.createUser({
          id: accessTokenPayload.sub,
          email: accessTokenPayload.email,
          role: accessTokenPayload.description as Role,
          name: accessTokenPayload.name,
        });
      } catch (e) {
        console.log("User already exists, skipping creation.");
      }

      return c.json({
        message: "Login successful",
        token: ssoResponse.data.refresh_token,
        user: {
          id: accessTokenPayload.sub,
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
