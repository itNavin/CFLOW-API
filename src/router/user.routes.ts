import { Hono } from "hono";
import { UserController } from "../controller/user.controller";

export const userRouter = new Hono();

userRouter.get(
  "/my-project/course/:courseId",
  UserController.getMyProjectByCourse
);

userRouter.post(
  "/upload-userData",
  UserController.uploadUserDataByExcel
);

userRouter.post("/create-lecturer", UserController.createLecturerUser);

userRouter.post("/create-solar-lecturer", UserController.createSolarLecturerUser);

userRouter.get("/all-users", UserController.getAllUsers);

userRouter.post("/update-solar-password", UserController.updateSolarPassword);

userRouter.get("/fetchStudentData", UserController.fetchStudentData);