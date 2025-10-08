import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { mainRouter } from "./router/main.routes";
import { prisma } from "./prisma";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";

const app = new Hono({ strict: false });

prisma.$connect().catch((e: Error) => {
  throw new Error(`Error connecting to database : ${e}`);
});

app.use(logger());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
    exposeHeaders: ["X-Refresh-Token"],
  })
);

const assetsRoot = path.join(process.cwd(), "src", "assets");
app.use(
  "/email-assets/*",
  serveStatic({
    root: assetsRoot,
    // so /email-assets/SIT-LOGO.png -> /src/assets/SIT-LOGO.png
    rewriteRequestPath: (p) => p.replace(/^\/email-assets\//, ""),
  })
);

app.get("/", (c) => c.text("Hello Hono!"));
app.route("", mainRouter);

export default {
  fetch: app.fetch,
  port: 8000,
};
