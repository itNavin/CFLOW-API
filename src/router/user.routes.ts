import { Hono } from "hono";
import { UserController } from "../controller/user.controller";

export const userRouter = new Hono();

// userRouter.post("/createUser", UserController.createUser);

// userRouter.get("/", UserController.getUserById);

// userRouter.get("/users", UserController.getAllUsers);

userRouter.get(
  "/my-project/course/:courseId",
  UserController.getMyProjectByCourse
);

userRouter.post(
  "/upload-userData",
  UserController.uploadUserDataByExcel
);