import { Hono } from "hono";
import { CourseMemberController } from "../controller/courseMember.controller";

export const courseMemberRouter = new Hono();

courseMemberRouter.get(
  "/:courseId",
  CourseMemberController.getAllCourseMembers
);
courseMemberRouter.get(
  "/:courseId/advisors",
  CourseMemberController.getAdvisorMembers
);
courseMemberRouter.get(
  "/:courseId/students",
  CourseMemberController.getStudentMembers
);

// ✅ POST to add a member by userId
// Body: { "userId": 123 }
courseMemberRouter.post("/:courseId/members", CourseMemberController.addMember);
