import { Context } from "hono";
import { uploadToMinio } from "src/lib/minio";
import FileModel from "src/model/file.model";
import SubmissionModel from "src/model/submission.model";
import FeedbackModel from "src/model/feedback.model";
import { v4 as uuidv4 } from "uuid";
import { isValidUUID } from "src/types/uuid";
import { prisma } from "../prisma";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

const ALLOW_EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  md: "text/markdown",
  json: "application/json",
  zip: "application/zip",
};

const BLOCK_EXT = new Set([
  // macro-enabled Office
  "docm", "xlsm", "pptm",
  // archives & installers/executables/scripts (keep ZIP out for feedback uploads)
  "rar","7z","gz","bz2","xz",
  "exe","dll","so","dylib","msi","pkg","dmg","iso","jar","apk","com","scr",
  "bat","cmd","ps1","vbs","wsf","sh","bash","zsh","php","py","rb","pl","reg","hta",
  // web script/html
  "html","htm","js","mjs"
]);

const BLOCK_MIME = new Set([
  "text/html",
  "application/javascript",
  "text/javascript",
  "application/x-msdownload",
  "application/x-msdos-program",
]);

function startsWithBytes(buf: Uint8Array, sig: number[]) {
  if (buf.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return false;
  return true;
}

function getExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function sniffBinaryMime(buf: Uint8Array, ext: string): string | null {
  if (startsWithBytes(buf, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (startsWithBytes(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  if (startsWithBytes(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    startsWithBytes(buf, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWithBytes(buf, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  )
    return "image/gif";
  if (
    startsWithBytes(buf, [0x52, 0x49, 0x46, 0x46]) &&
    buf.length >= 12 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    (ext === "docx" || ext === "xlsx" || ext === "pptx") &&
    (startsWithBytes(buf, [0x50, 0x4b, 0x03, 0x04]) ||
      startsWithBytes(buf, [0x50, 0x4b, 0x05, 0x06]))
  ) {
    return ALLOW_EXT_TO_MIME[ext];
  }
  return null;
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx + 1).toLowerCase();
}

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
      if (!courseId) return c.json({ error: "courseId is required" }, 400);
      if (!isValidUUID(courseId)) {
        return c.json({ error: "courseId must be a valid UUID" }, 400);
      }

      const announcementIdRaw = formData.get("announcementId");
      const announcementId =
        typeof announcementIdRaw === "string" ? announcementIdRaw.trim() : "";
      if (announcementId && !isValidUUID(announcementId)) {
        return c.json({ error: "announcementId must be a valid UUID" }, 400);
      }

      const file = formData.get("file") as File | null;
      if (!file) return c.json({ error: "No file uploaded" }, 400);

      if (file.size > MAX_SIZE_BYTES) {
        return c.json(
          {
            error: `File too large (max ${Math.floor(
              MAX_SIZE_BYTES / (1024 * 1024)
            )}MB)`,
          },
          400
        );
      }

      const ext = getExtension(file.name);
      if (!ext || BLOCK_EXT.has(ext)) {
        return c.json(
          { error: `Disallowed file extension: .${ext || "(none)"}` },
          400
        );
      }
      const allowedMimeByExt = ALLOW_EXT_TO_MIME[ext];
      if (!allowedMimeByExt) {
        return c.json({ error: `File type not allowed: .${ext}` }, 400);
      }

      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);

      const sniffed = sniffBinaryMime(bytes, ext);

      const clientType = (file.type || "").toLowerCase();
      if (clientType && BLOCK_MIME.has(clientType)) {
        return c.json(
          { error: `Dangerous MIME is not allowed: ${clientType}` },
          400
        );
      }

      let finalMime = allowedMimeByExt;
      if (sniffed) {
        if (sniffed !== allowedMimeByExt) {
          return c.json(
            { error: "File content does not match declared type" },
            400
          );
        }
        finalMime = sniffed;
      }

      const uniqueFileName = `${uuidv4()}.${ext}`;
      const objectKey = announcementId
        ? `course-${courseId}/file/announcement-${announcementId}/${uniqueFileName}`
        : `course-${courseId}/file/${uniqueFileName}`;

      const putKey = await uploadToMinio(
        objectKey,
        Buffer.from(arrayBuf),
        finalMime
      );

      const absoluteFileUrl = `http://${Bun.env.MINIO_ENDPOINT}:9000/${Bun.env.MINIO_BUCKET}/${putKey}`;

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
          accepted: { ext, mime: finalMime, size: file.size },
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
        return c.json({ error: "Forbidden: staff, or SUPER_ADMIN only" }, 403);
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
      if (role !== "student")
        return c.json({ error: "Forbidden: STUDENT only" }, 403);

      const userId = c.get("userId");
      if (!userId) return c.json({ error: "Unauthorized" }, 401);

      const courseId = String(formData.get("courseId") ?? "");
      if (!courseId) return c.json({ error: "courseId is required" }, 400);
      if (!isValidUUID(courseId))
        return c.json({ error: "courseId must be a valid UUID" }, 400);

      const assignmentId = String(formData.get("assignmentId") ?? "");
      if (!assignmentId)
        return c.json({ error: "assignmentId is required" }, 400);
      if (!isValidUUID(assignmentId))
        return c.json({ error: "assignmentId must be a valid UUID" }, 400);

      const deliverableId = String(formData.get("deliverableId") ?? "");
      if (!deliverableId)
        return c.json({ error: "deliverableId is required" }, 400);
      if (!isValidUUID(deliverableId))
        return c.json({ error: "deliverableId must be a valid UUID" }, 400);

      const cm = await prisma.courseMember.findUnique({
        where: { courseId_userId: { courseId, userId } },
        select: { id: true },
      });
      if (!cm)
        return c.json({ error: "You are not a member of this course" }, 403);

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
      if (!isValidUUID(groupId))
        return c.json({ error: "groupId must be a valid UUID" }, 400);

      const submissionId = String(formData.get("submissionId") ?? "");
      if (!submissionId)
        return c.json({ error: "submissionId is required" }, 400);
      if (!isValidUUID(submissionId))
        return c.json({ error: "submissionId must be a valid UUID" }, 400);

      const allowed = await prisma.allowedFileType.findMany({
        where: { deliverableId },
        select: { mime: true },
      });
      if (allowed.length === 0) {
        return c.json(
          { error: "No allowed file types configured for this deliverable" },
          400
        );
      }
      const allowedMimes = new Set(allowed.map((a) => a.mime));

      const file = formData.get("file") as File | null;
      if (!file) return c.json({ error: "No file uploaded" }, 400);
      if (file.size > MAX_SIZE_BYTES) {
        return c.json(
          {
            error: `File too large (max ${Math.floor(
              MAX_SIZE_BYTES / 1024 / 1024
            )}MB)`,
          },
          400
        );
      }

      const ext = getExt(file.name);
      const buf = new Uint8Array(await file.arrayBuffer());

      const sniffed = sniffBinaryMime(buf, ext);
      const clientType = (file.type || "").toLowerCase();

      let finalMime: string | null = null;
      if (sniffed) {
        finalMime = sniffed;
      } else if (clientType) {
        finalMime = clientType;
      } else {
        if (ext === "txt") finalMime = "text/plain";
        else if (ext === "csv") finalMime = "text/csv";
        else if (ext === "md") finalMime = "text/markdown";
        else if (ext === "json") finalMime = "application/json";
      }

      if (!finalMime) {
        return c.json(
          { error: "Cannot determine file type; upload rejected" },
          415
        );
      }
      if (!allowedMimes.has(finalMime)) {
        return c.json(
          {
            error: "File type not allowed for this deliverable",
            receivedMime: finalMime,
            allowedMimes: [...allowedMimes],
          },
          415
        );
      }

      const unique = `${uuidv4()}.${ext || "bin"}`;
      const objectKey = `course-${courseId}/assignment-${assignmentId}/deliverable-${deliverableId}/group-${groupId}/submission-${submissionId}/${unique}`;

      const putKey = await uploadToMinio(
        objectKey,
        Buffer.from(buf),
        finalMime
      );
      const absoluteFileUrl = `http://${Bun.env.MINIO_ENDPOINT}:9000/${Bun.env.MINIO_BUCKET}/${putKey}`;

      const newFile = await SubmissionModel.createSubmissionFile({
        submissionId,
        deliverableId,
        fileUrl: absoluteFileUrl,
      });

      return c.json(
        {
          message: "File uploaded successfully",
          file: newFile,
          accepted: { mime: finalMime, ext, size: file.size },
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
      if (!courseId) return c.json({ error: "courseId is required" }, 400);
      if (!isValidUUID(courseId))
        return c.json({ error: "courseId must be a valid UUID" }, 400);

      const assignmentId = String(formData.get("assignmentId") ?? "");
      if (!assignmentId)
        return c.json({ error: "assignmentId is required" }, 400);
      if (!isValidUUID(assignmentId))
        return c.json({ error: "assignmentId must be a valid UUID" }, 400);

      const deliverableId = String(formData.get("deliverableId") ?? "");
      if (!deliverableId)
        return c.json({ error: "deliverableId is required" }, 400);
      if (!isValidUUID(deliverableId))
        return c.json({ error: "deliverableId must be a valid UUID" }, 400);

      const groupId = String(formData.get("groupId") ?? "");
      if (!groupId) return c.json({ error: "groupId is required" }, 400);
      if (!isValidUUID(groupId))
        return c.json({ error: "groupId must be a valid UUID" }, 400);

      const submissionId = String(formData.get("submissionId") ?? "");
      if (!submissionId)
        return c.json({ error: "submissionId is required" }, 400);
      if (!isValidUUID(submissionId))
        return c.json({ error: "submissionId must be a valid UUID" }, 400);

      const feedbackId = String(formData.get("feedbackId") ?? "");
      if (!feedbackId) return c.json({ error: "feedbackId is required" }, 400);
      if (!isValidUUID(feedbackId))
        return c.json({ error: "feedbackId must be a valid UUID" }, 400);

      const file = formData.get("file") as File | null;
      if (!file) return c.json({ error: "No file uploaded" }, 400);

      if (file.size > MAX_SIZE_BYTES) {
        return c.json(
          {
            error: `File too large (max ${Math.floor(
              MAX_SIZE_BYTES / (1024 * 1024)
            )}MB)`,
          },
          400
        );
      }

      const ext = getExt(file.name);
      if (!ext || BLOCK_EXT.has(ext)) {
        return c.json(
          { error: `Disallowed file extension: .${ext || "(none)"}` },
          400
        );
      }
      const allowedMimeByExt = ALLOW_EXT_TO_MIME[ext];
      if (!allowedMimeByExt) {
        return c.json({ error: `File type not allowed: .${ext}` }, 400);
      }

      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);

      const clientType = (file.type || "").toLowerCase();
      if (clientType && BLOCK_MIME.has(clientType)) {
        return c.json(
          { error: `Dangerous MIME is not allowed: ${clientType}` },
          400
        );
      }

      const sniffed = sniffBinaryMime(bytes, ext);
      let finalMime = allowedMimeByExt;
      if (sniffed) {
        if (sniffed !== allowedMimeByExt) {
          return c.json(
            { error: "File content does not match declared type" },
            400
          );
        }
        finalMime = sniffed;
      }

      const uniqueFileName = `${uuidv4()}.${ext}`;
      const objectKey =
        `course-${courseId}/assignment-${assignmentId}/deliverable-${deliverableId}` +
        `/group-${groupId}/submission-${submissionId}/feedbackId-${feedbackId}/${uniqueFileName}`;

      const putKey = await uploadToMinio(
        objectKey,
        Buffer.from(arrayBuf),
        finalMime
      );

      const absoluteFileUrl = `http://${Bun.env.MINIO_ENDPOINT}:9000/${Bun.env.MINIO_BUCKET}/${putKey}`;

      const newFile = await FeedbackModel.createFeedbackFile({
        feedbackId,
        deliverableId,
        fileUrl: absoluteFileUrl,
      });

      return c.json(
        {
          message: "File uploaded successfully",
          file: newFile,
          accepted: { ext, mime: finalMime, size: file.size },
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
