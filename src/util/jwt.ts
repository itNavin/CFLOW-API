import * as jwt from "jsonwebtoken";
import { AuthPayload } from "../types/payload/auth.type"

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is missing");
  return secret;
}

export function decodeToken(token: string): AuthPayload.Auth {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  }) as AuthPayload.Auth;
}

export function getTokenFromHeader(authHeader?: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
}
