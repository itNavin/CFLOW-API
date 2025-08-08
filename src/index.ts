import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { mainRouter } from "./router/main.routes";
import { PrismaClient } from "./generated/prisma";

const app = new Hono({
  strict: false,
});

export const prisma = new PrismaClient();

prisma.$connect().catch((e: Error) => {
  throw new Error(`Error connecting to database : ${e}`);
});

app.use(logger());

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("", mainRouter);

export default {
  fetch: app.fetch,
  port: 8000,
};
