import { Hono } from "hono";
import { CourseMemberController } from "../controller/courseMember.controller";

export const courseMemberRouter = new Hono();
courseMemberRouter.get(
  "/staff/course/:courseId",
  CourseMemberController.getStaffMembers
);
courseMemberRouter.get(
  "/staffNotInCourse/course/:courseId",
  CourseMemberController.getStaffNotInCourse
);

courseMemberRouter.get(
  "/advisors/course/:courseId",
  CourseMemberController.getAdvisorMembers
);
courseMemberRouter.get(
  "/advisorsNotInCourse/course/:courseId",
  CourseMemberController.getAdvisorNotInCourse
);
courseMemberRouter.get(
  "/students/course/:courseId",
  CourseMemberController.getStudentMembers
);
courseMemberRouter.get(
  "/studentsNotInCourse/course/:courseId",
  CourseMemberController.getStudentNotInCourse
);
courseMemberRouter.post("/addMembers", CourseMemberController.addMembers);
courseMemberRouter.delete(
  "/deleteMembers",
  CourseMemberController.deleteCourseMembers
);