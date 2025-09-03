import { Hono } from "hono";
import { AuthController } from "../controller/auth.controller";
import { authMiddleware } from "src/middleware/auth";

export const authRouter = new Hono();

authRouter.post("/login", AuthController.login);
authRouter.get("/verify", authMiddleware, AuthController.verify);
