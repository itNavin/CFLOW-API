import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { mainRouter } from "./router/main.routes";
import { prisma } from "./prisma"; // ✅ use the shared client

const app = new Hono({ strict: false });

// Optional: connect early (Prisma will lazy-connect anyway)
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

app.get("/", (c) => c.text("Hello Hono!"));
app.route("", mainRouter);

export default {
  fetch: app.fetch,
  port: 8000,
};
