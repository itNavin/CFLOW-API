import { Hono } from "hono";
import { PublicFileController } from "src/controller/publicFile.controller";

export const publicRouter = new Hono();

publicRouter.get("/files/:token", PublicFileController.serve);
publicRouter.get("/files/:token/:filename", PublicFileController.serve);

