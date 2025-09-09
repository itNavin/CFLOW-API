import { Hono } from "hono";
import { CourseController } from "../controller/course.controller";

export const courseRouter = new Hono();

courseRouter.post("/createCourse", CourseController.createCourse);
courseRouter.put("/updateCourseById", CourseController.updateCourseById);
courseRouter.get("/getStaffCourse", CourseController.getStaffCourses);
courseRouter.get("/getCourseByUser", CourseController.getCourseByUser);
courseRouter.get("/course/:courseId", CourseController.getCoursenameById);


