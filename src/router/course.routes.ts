import { Hono } from "hono";
import { CourseController } from "../controller/course.controller";

export const courseRouter = new Hono();

courseRouter.post("/createCourse", CourseController.createCourse);
courseRouter.get("/getAllCourse", CourseController.getAllCourses);
courseRouter.get("/my-courses", CourseController.getCourseByUser);
