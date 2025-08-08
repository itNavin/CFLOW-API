import {
  getAllCourseMembers,
  getAdvisorMembers,
  getStudentMembers,
} from "../model/courseMember.model";
import { Context } from "hono";

export const CourseMemberController = {
  getAllCourseMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    const members = await getAllCourseMembers(courseId);
    return c.json(members);
  },

  getAdvisorMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    const advisors = await getAdvisorMembers(courseId);
    return c.json(advisors);
  },

  getStudentMembers: async (c: Context) => {
    const courseId = Number(c.req.param("courseId"));
    const students = await getStudentMembers(courseId);
    return c.json(students);
  },
};
