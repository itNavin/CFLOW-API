import {Hono} from "hono";
import { LoginController } from "../controller/auth/login"

export const loginRouter = new Hono();

loginRouter.post("/", LoginController.login);