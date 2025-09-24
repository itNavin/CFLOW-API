import type { Context } from "hono";
import { StatusModel } from "src/model/status.model";
import { isValidUUID } from "src/types/uuid";
import { SubmissionStatus } from "@prisma/client";

const NOT_SUBMITTED = "NOT_SUBMITTED" as const;
type AllowedStatus = SubmissionStatus | typeof NOT_SUBMITTED;

function readStatusParam(
  raw?: string | null
): AllowedStatus | undefined | "INVALID" {
  if (!raw) return undefined;
  const up = String(raw).toUpperCase();

  if (up === "NOT_SUBMITTED") return NOT_SUBMITTED;

  const matches = Object.values(SubmissionStatus).includes(
    up as SubmissionStatus
  );
  return matches ? (up as SubmissionStatus) : "INVALID";
}

export const StatusController = {
  
  getAllGroupStatusInCourse: async (c: Context) => {
    try {
      const role = c.get("role");
      if( role!== "staff"){
        return c.json({ error: "Forbidden: STAFF only" }, 403);
      }
      const courseId = c.req.param("courseId");
      if (!courseId) return c.json({ error: "courseId is required" }, 400);
      if (!isValidUUID(courseId)) {
        return c.json({ error: "Invalid courseId (UUID expected)" }, 400);
      }

      const assignmentId = c.req.query("assignmentId") ?? undefined;
      if (
        assignmentId !== undefined &&
        assignmentId !== "" &&
        !isValidUUID(assignmentId)
      ) {
        return c.json({ error: "Invalid assignmentId (UUID expected)" }, 400);
      }

      const groupId = c.req.query("groupId") ?? undefined;
      if (groupId !== undefined && groupId !== "" && !isValidUUID(groupId)) {
        return c.json({ error: "Invalid groupId (UUID expected)" }, 400);
      }

      const statusParam = readStatusParam(c.req.query("status"));
      if (statusParam === "INVALID") {
        return c.json(
          {
            error: "Invalid status",
            allowed: ["NOT_SUBMITTED", ...Object.values(SubmissionStatus)],
          },
          400
        );
      }

      const data = await StatusModel.getAllGroupStatusInCourse({
        courseId,
        assignmentId: assignmentId || undefined,
        groupId: groupId || undefined,
        status: statusParam,
      });

      return c.json(
        {
          message: "Success",
          courseId,
          filters: {
            assignmentId: assignmentId || null,
            groupId: groupId || null,
            status: (statusParam as string | undefined) ?? null,
          },
          assignments: data, 
        },
        200
      );
    } catch (error: any) {
      if (error?.message === "COURSE_NOT_FOUND") {
        return c.json({ error: "This course doesn't exist." }, 404);
      }
      console.error({
        context: "getAllGroupStatusInCourse",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
};
