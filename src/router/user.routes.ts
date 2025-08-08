import { Hono } from "hono";
import { UserController } from "../controller/user.controller";

export const userRouter = new Hono();

userRouter.post("/createUser", UserController.createUser);
userRouter.get("/user/:id", UserController.getUserById);
userRouter.get("/users", UserController.getAllUsers);

