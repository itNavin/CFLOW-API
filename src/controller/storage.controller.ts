import { Context } from "hono";
import { uploadToMinio } from "src/lib/minio";
import FileModel from "src/model/file.model";
import SubmissionModel from "src/model/submission.model";
import FeedbackModel from "src/model/feedback.model";
import { v4 as uuidv4 } from "uuid";
import { isValidUUID } from "src/types/uuid";
import { prisma } from "../prisma";

export const StorageController = {
  uploadCourseFile: async (c: Context) => {
    try {
      const userId = c.get("userId");
      const role = c.get("role");
      if (role !== "lecturer" && role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden: lecturer and staff only" }, 403);
      }

      const formData = await c.req.formData();

      const courseId = String(formData.get("courseId") ?? "");
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const announcementId = String(formData.get("announcementId") ?? "");
      if (announcementId && !isValidUUID(announcementId)) {
        return c.json({ error: "announcementId must be a valid UUID" }, 400);
      }

      const file = formData.get("file") as File | null;
      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const fileName = announcementId
        ? `course-${courseId}/file/announcement-${announcementId}/${uniqueFileName}`
        : `course-${courseId}/file/${uniqueFileName}`;

      const fileBuffer = await file.arrayBuffer();
      const uploadResult = await uploadToMinio(
        fileName,
        Buffer.from(fileBuffer)
      );

      const absoluteFileUrl = `http://${Bun.env.MINIO_ENDPOINT}:9000/${Bun.env.MINIO_BUCKET}/${uploadResult}`;

      const newFile = await FileModel.createFile({
        name: file.name,
        filepath: absoluteFileUrl,
        createdById: userId,
        courseId,
        announcementId: announcementId || null,
      });

      return c.json(
        {
          message: "File uploaded successfully",
          file: newFile,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "uploadCourseFile",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
  uploadAssignmentFile: async (c: Context) => {
    try {
      const userId = c.get("userId");
      const role = c.get("role");
      if (role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json(
          { error: "Forbidden: staff, or SUPER_ADMIN only" },
          403
        );
      }

      const formData = await c.req.formData();

      const courseId = String(formData.get("courseId") ?? "");
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const assignmentId = String(formData.get("assignmentId") ?? "");
      if (!assignmentId) {
        return c.json({ error: "assignmentId is required" }, 400);
      }
      if (!isValidUUID(assignmentId)) {
        return c.json({ error: "assignmentId must be a valid UUID" }, 400);
      }

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { courseId: true },
      });
      if (!assignment) {
        return c.json({ error: "Assignment not found" }, 404);
      }
      if (assignment.courseId !== courseId) {
        return c.json(
          { error: "assignmentId does not belong to the given courseId" },
          400
        );
      }

      const file = formData.get("file") as File | null;
      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;

      const fileNameBase = `course-${courseId}/assignment-${assignmentId}`;
      const fullObjectKey = `${fileNameBase}/${uniqueFileName}`;

      const fileBuffer = await file.arrayBuffer();
      const uploadResult = await uploadToMinio(
        fullObjectKey,
        Buffer.from(fileBuffer)
      );

      const absoluteFileUrl = `http://${Bun.env.MINIO_ENDPOINT}:9000/${Bun.env.MINIO_BUCKET}/${uploadResult}`;

      const assignmentFile = await prisma.assignmentFile.create({
        data: {
          assignmentId,
          fileUrl: [absoluteFileUrl],
        },
      });

      return c.json(
        {
          message: "Assignment file uploaded successfully",
          file: {
            originalName: file.name,
            url: absoluteFileUrl,
          },
          assignmentFile,
          uploadedBy: userId,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "uploadAssignmentFile",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  uploadSubmissionFile: async (c: Context) => {
    try {
      const formData = await c.req.formData();

      const role = c.get("role");
      if (role !== "student") {
        return c.json({ error: "Forbidden: STUDENT only" }, 403);
      }

      const userId = c.get("userId");
      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const courseId = String(formData.get("courseId") ?? "");
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const assignmentId = String(formData.get("assignmentId") ?? "");
      if (!assignmentId) {
        return c.json({ error: "assignmentId is required" }, 400);
      }
      if (!isValidUUID(assignmentId)) {
        return c.json({ error: "assignmentId must be a valid UUID" }, 400);
      }

      const deliverableId = String(formData.get("deliverableId") ?? "");
      if (!deliverableId) {
        return c.json({ error: "deliverableId is required" }, 400);
      }
      if (!isValidUUID(deliverableId)) {
        return c.json({ error: "deliverableId must be a valid UUID" }, 400);
      }

      const cm = await prisma.courseMember.findUnique({
        where: { courseId_userId: { courseId, userId } },
        select: { id: true },
      });
      if (!cm) {
        return c.json({ error: "You are not a member of this course" }, 403);
      }

      const memberships = await prisma.groupMember.findMany({
        where: { courseMemberId: cm.id },
        select: { groupId: true },
        orderBy: { groupId: "asc" },
      });

      if (memberships.length === 0) {
        return c.json(
          { error: "You are not in any group for this course" },
          400
        );
      }
      if (memberships.length > 1) {
        return c.json(
          {
            error:
              "You belong to multiple groups in this course. Please ask staff to resolve.",
            groupIds: memberships.map((m) => m.groupId),
          },
          409
        );
      }

      const groupId = memberships[0].groupId;
      if (!groupId) {
        return c.json(
          { error: "You are not in any group for this course" },
          400
        );
      }
      if (!isValidUUID(groupId)) {
        return c.json({ error: "groupId must be a valid UUID" }, 400);
      }

      const submissionId = String(formData.get("submissionId") ?? "");
      if (!submissionId) {
        return c.json({ error: "submissionId is required" }, 400);
      }
      if (!isValidUUID(submissionId)) {
        return c.json({ error: "submissionId must be a valid UUID" }, 400);
      }

      const file = formData.get("file") as File | null;
      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const fileName = `course-${courseId}/assignment-${assignmentId}/deliverable-${deliverableId}/group-${groupId}/submission-${submissionId}/${uniqueFileName}`;

      const fileBuffer = await file.arrayBuffer();
      const uploadResult = await uploadToMinio(
        fileName,
        Buffer.from(fileBuffer)
      );

      const absoluteFileUrl = `http://${Bun.env.MINIO_ENDPOINT}:9000/${Bun.env.MINIO_BUCKET}/${uploadResult}`;

      const newFile = await SubmissionModel.createSubmissionFile({
        submissionId: submissionId,
        deliverableId: deliverableId,
        fileUrl: absoluteFileUrl,
      });
      return c.json(
        {
          message: "File uploaded successfully",
          file: newFile,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "uploadSubmissionFile",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json({ message: "Failed to upload submission file" }, 500);
    }
  },

  uploadFeedbackFile: async (c: Context) => {
    try {
      const formData = await c.req.formData();

      const role = c.get("role");
      if (role !== "lecturer") {
        return c.json({ error: "Forbidden: LECTURER only" }, 403);
      }

      const courseId = String(formData.get("courseId") ?? "");
      if (!courseId) {
        return c.json({ error: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const assignmentId = String(formData.get("assignmentId") ?? "");
      if (!assignmentId) {
        return c.json({ error: "assignmentId is required" }, 400);
      }
      if (!isValidUUID(assignmentId)) {
        return c.json({ error: "assignmentId must be a valid UUID" }, 400);
      }

      const deliverableId = String(formData.get("deliverableId") ?? "");
      if (!deliverableId) {
        return c.json({ error: "deliverableId is required" }, 400);
      }
      if (!isValidUUID(deliverableId)) {
        return c.json({ error: "deliverableId must be a valid UUID" }, 400);
      }

      const groupId = String(formData.get("groupId") ?? "");
      if (!groupId) {
        return c.json({ error: "groupId is required" }, 400);
      }
      if (!isValidUUID(groupId)) {
        return c.json({ error: "groupId must be a valid UUID" }, 400);
      }

      const submissionId = String(formData.get("submissionId") ?? "");
      if (!submissionId) {
        return c.json({ error: "submissionId is required" }, 400);
      }
      if (!isValidUUID(submissionId)) {
        return c.json({ error: "submissionId must be a valid UUID" }, 400);
      }

      const feedbackId = String(formData.get("feedbackId") ?? "");
      if (!feedbackId) {
        return c.json({ error: "feedbackId is required" }, 400);
      }
      if (!isValidUUID(feedbackId)) {
        return c.json({ error: "feedbackId must be a valid UUID" }, 400);
      }

      const file = formData.get("file") as File | null;
      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const fileName = `course-${courseId}/assignment-${assignmentId}/deliverable-${deliverableId}/group-${groupId}/submission-${submissionId}/feedbackId-${feedbackId}/${uniqueFileName}`;

      const fileBuffer = await file.arrayBuffer();
      const uploadResult = await uploadToMinio(
        fileName,
        Buffer.from(fileBuffer)
      );

      const absoluteFileUrl = `http://${Bun.env.MINIO_ENDPOINT}:9000/${Bun.env.MINIO_BUCKET}/${uploadResult}`;

      const newFile = await FeedbackModel.createFeedbackFile({
        feedbackId: feedbackId,
        deliverableId: deliverableId,
        fileUrl: absoluteFileUrl,
      });
      return c.json(
        {
          message: "File uploaded successfully",
          file: newFile,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "uploadFeedbackFile",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json({ message: "Failed to upload feedback file" }, 500);
    }
  },
};
