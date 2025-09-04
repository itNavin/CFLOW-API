import { Context } from "hono";
import { uploadToMinio } from "src/lib/minio";
import FileModel from "src/model/file.model";
import SubmissionModel from "src/model/submission.model";
import FeedbackModel from "src/model/feedback.model";
import { v4 as uuidv4 } from "uuid";

export const StorageController = {
  uploadCourseFile: async (c: Context) => {
    try {
      const userId = c.get("userId");
      const role = c.get("role");
      if (role !== "lecturer" && role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json({ error: "Forbidden: lecturer and staff only" }, 403);
      }

      const courseId = Number(c.req.param("courseId"));
      const announcementIdQuery = c.req.query("announcementId");
      const announcementId = announcementIdQuery
        ? Number(announcementIdQuery)
        : -1;

      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const fileName =
        announcementId > 0
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
        announcementId: announcementId > 0 ? announcementId : null,
      });

      return c.json(newFile, 201);
    } catch (e) {
      return c.json({ message: `Error uploading course file: ${e}` }, 500);
    }
  },

  UploadSubmissionFile: async (c: Context) => {
    try {
      const role = c.get("role");
      const courseId = Number(c.req.param("courseId"));
      const assignmentId = Number(c.req.query("assignmentId"));
      const deliverableId = Number(c.req.query("deliverableId"));
      const groupId = Number(c.req.query("groupId"));
      const submissionId = Number(c.req.query("submissionId"));

      if (role !== "student") {
        return c.json({ error: "Forbidden: STUDENT only" }, 403);
      }

      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const fileName = 
      `course-${courseId}/assignment-${assignmentId}/deliverable-${deliverableId}/group-${groupId}/submission-${submissionId}/${uniqueFileName}`;

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
      return c.json(newFile, 201);
    } catch (e) {
      return c.json({ message: `Error uploading submission file: ${e}` }, 500);
    }
  },

  UploadFeedbackFile: async (c: Context) => {
    try {
      const role = c.get("role");
      const courseId = Number(c.req.param("courseId"));
      const assignmentId = Number(c.req.query("assignmentId"));
      const deliverableId = Number(c.req.query("deliverableId"));
      const groupId = Number(c.req.query("groupId"));
      const feedbackId = Number(c.req.query("feedbackId"));
      const submissionId = Number(c.req.query("submissionId"));

      if (role !== "lecturer") {
        return c.json({ error: "Forbidden: LECTURER only" }, 403);
      }

      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const fileName = 
      `course-${courseId}/assignment-${assignmentId}/deliverable-${deliverableId}/group-${groupId}/submission-${submissionId}/feedbackId-${feedbackId}/${uniqueFileName}`;

      const fileBuffer = await file.arrayBuffer();
      const uploadResult = await uploadToMinio(
        fileName,
        Buffer.from(fileBuffer)
      );

      const absoluteFileUrl = `http://${Bun.env.MINIO_ENDPOINT}/${Bun.env.MINIO_BUCKET}/${uploadResult}`;

      const newFile = await FeedbackModel.createFeedbackFile({
        feedbackId: feedbackId,
        
        deliverableId: deliverableId,
        fileUrl: absoluteFileUrl,
      });
      return c.json(newFile, 201);
    } catch (e) {
      return c.json({ message: `Error uploading submission file: ${e}` }, 500);
    }
  }
};
