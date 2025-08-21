// src/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Reuse the client in dev to avoid too many connections
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
