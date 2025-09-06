import { Hono } from "hono";
import { CourseMemberController } from "../controller/courseMember.controller";

export const courseMemberRouter = new Hono();

courseMemberRouter.get(
  "/course/:courseId",
  CourseMemberController.getAllCourseMembers
);

courseMemberRouter.get(
  "/advisors/course/:courseId",
  CourseMemberController.getAdvisorMembers
);

courseMemberRouter.get(
  "/students/course/:courseId",
  CourseMemberController.getStudentMembers
);

courseMemberRouter.post("/members/course/:courseId", CourseMemberController.addMember);

courseMemberRouter.delete(
  "/deleteMembers",
  CourseMemberController.deleteMembersBulk
);

courseMemberRouter.get(
  "/advisorsNotInCourse/course/:courseId",
  CourseMemberController.getAdvisorNotInCourse
);

courseMemberRouter.get(
  "/studentsNotInCourse/course/:courseId",
  CourseMemberController.getStudentNotInCourse
);
