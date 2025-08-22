import {Hono} from "hono";
import { LoginController } from "../controller/auth/login"
import { file } from "bun";

export const loginRouter = new Hono();

loginRouter.post("/", LoginController.login);