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
import { submissionMail } from "src/mail/submission.mail";
import { feedbackMail } from "src/mail/feedback.mail";
import { group } from "console";
import {
  ALLOW_EXT_TO_MIME,
  buildPublicFileUrl,
  ensureOrigin,
} from "src/util/storage";

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

const BLOCK_EXT = new Set([
  // macro-enabled Office
  "docm",
  "xlsm",
  "pptm",
  // archives & installers/executables/scripts (keep ZIP out for feedback uploads)
  "rar",
  "7z",
  "gz",
  "bz2",
  "xz",
  "exe",
  "dll",
  "so",
  "dylib",
  "msi",
  "pkg",
  "dmg",
  "iso",
  "jar",
  "apk",
  "com",
  "scr",
  "bat",
  "cmd",
  "ps1",
  "vbs",
  "wsf",
  "sh",
  "bash",
  "zsh",
  "php",
  "py",
  "rb",
  "pl",
  "reg",
  "hta",
  // web script/html
  "html",
  "htm",
  "js",
  "mjs",
]);

const BLOCK_MIME = new Set([
  "text/html",
  "application/javascript",
  "text/javascript",
  "application/x-msdownload",
  "application/x-msdos-program",
]);

const STRICT_MIME_VALIDATION = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/zip",
]);

const ZIP_SIGNATURE_EXTS = new Set(["docx", "xlsx", "pptx", "zip"]);

function startsWithBytes(buf: Uint8Array, sig: number[]) {
  if (buf.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return false;
  return true;
}

function isZipLike(buf: Uint8Array) {
  return (
    startsWithBytes(buf, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWithBytes(buf, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWithBytes(buf, [0x50, 0x4b, 0x07, 0x08])
  );
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
  if (ZIP_SIGNATURE_EXTS.has(ext) && isZipLike(buf)) {
    const mapped = ALLOW_EXT_TO_MIME[ext];
    if (mapped) return mapped;
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
        return c.json({ message: "Forbidden: lecturer and staff only" }, 403);
      }

      const origin = getRequestOrigin(c);
      const formData = await c.req.formData();

      const courseId = String(formData.get("courseId") ?? "");
      if (!courseId) return c.json({ message: "courseId is required" }, 400);
      if (!isValidUUID(courseId)) {
        return c.json({ message: "courseId must be a valid UUID" }, 400);
      }

      const announcementIdRaw = formData.get("announcementId");
      const announcementId =
        typeof announcementIdRaw === "string" ? announcementIdRaw.trim() : "";
      if (announcementId && !isValidUUID(announcementId)) {
        return c.json({ message: "announcementId must be a valid UUID" }, 400);
      }

      const file = formData.get("file") as File | null;
      if (!file) return c.json({ message: "No file uploaded" }, 400);

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
          { message: `Disallowed file extension: .${ext || "(none)"}` },
          400
        );
      }
      const allowedMimeByExt = ALLOW_EXT_TO_MIME[ext];
      if (!allowedMimeByExt) {
        return c.json({ message: `File type not allowed: .${ext}` }, 400);
      }

      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);

      const sniffed = sniffBinaryMime(bytes, ext);

      const clientType = (file.type || "").toLowerCase();
      if (clientType && BLOCK_MIME.has(clientType)) {
        return c.json(
          { message: `Dangerous MIME is not allowed: ${clientType}` },
          400
        );
      }

      let finalMime = allowedMimeByExt;
      if (sniffed) {
        if (sniffed !== allowedMimeByExt) {
          return c.json(
            { message: "File content does not match declared type" },
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

      const publicUrl = buildPublicFileUrl(putKey, file.name, origin);

      const newFile = await FileModel.createFile({
        name: file.name,
        filepath: publicUrl,
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
  uploadCourseFileCore: async (params: {
    courseId: string;
    announcementId?: string;
    file: File;
    origin?: string;
  }): Promise<string> => {
    const { courseId, announcementId, file, origin } = params;

    const ext = getExtension(file.name);
    const uniqueFileName = `${uuidv4()}.${ext}`;
    const objectKey = announcementId
      ? `course-${courseId}/file/announcement-${announcementId}/${uniqueFileName}`
      : `course-${courseId}/file/${uniqueFileName}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mime = ALLOW_EXT_TO_MIME[ext] || "application/octet-stream";
    const putKey = await uploadToMinio(objectKey, fileBuffer, mime);
    return buildPublicFileUrl(putKey, file.name, origin);
  },

  uploadAssignmentFile: async (c: Context) => {
    try {
      const origin = getRequestOrigin(c);
      const userId = c.get("userId");
      const role = c.get("role");
      if (role !== "staff" && role !== "SUPER_ADMIN") {
        return c.json({ message: "Forbidden: staff, or SUPER_ADMIN only" }, 403);
      }

      const formData = await c.req.formData();

      const courseId = String(formData.get("courseId") ?? "");
      if (!courseId) {
        return c.json({ message: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "courseId must be a valid UUID" }, 400);
      }

      const assignmentId = String(formData.get("assignmentId") ?? "");
      if (!assignmentId) {
        return c.json({ message: "assignmentId is required" }, 400);
      }
      if (!isValidUUID(assignmentId)) {
        return c.json({ message: "assignmentId must be a valid UUID" }, 400);
      }

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { courseId: true },
      });
      if (!assignment) {
        return c.json({ message: "Assignment not found" }, 404);
      }
      if (assignment.courseId !== courseId) {
        return c.json(
          { message: "assignmentId does not belong to the given courseId" },
          400
        );
      }

      const file = formData.get("file") as File | null;
      if (!file) {
        return c.json({ message: "No file uploaded" }, 400);
      }

      // Reuse the same core logic via helper (below)
      const url = await StorageController.uploadAssignmentFileCore({
        courseId,
        assignmentId,
        file,
        origin,
      });

      const assignmentFile = await prisma.assignmentFile.create({
        data: {
          assignmentId,
          name: file.name,
          fileUrl: url,
        },
      });

      return c.json(
        {
          message: "Assignment file uploaded successfully",
          file: {
            originalName: file.name,
            url,
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

  // --- NEW: core uploader used by other controllers (returns URL only) ---
  uploadAssignmentFileCore: async (params: {
    courseId: string;
    assignmentId: string;
    file: File;
    origin?: string;
  }): Promise<string> => {
    const { courseId, assignmentId, file, origin } = params;

    const fileExtension = file.name.includes(".")
      ? file.name.split(".").pop()
      : undefined;
    const uniqueFileName = fileExtension
      ? `${uuidv4()}.${fileExtension}`
      : uuidv4(); // fallback if no extension

    const fileNameBase = `course-${courseId}/assignment-${assignmentId}`;
    const fullObjectKey = `${fileNameBase}/${uniqueFileName}`;

    const fileBuffer = await file.arrayBuffer();
    const objectKey = await uploadToMinio(
      fullObjectKey,
      Buffer.from(fileBuffer)
    );
    return buildPublicFileUrl(objectKey, file.name, origin);
  },

  uploadSubmissionFile: async (c: Context) => {
    try {
      const origin = getRequestOrigin(c);
      const formData = await c.req.formData();

      const role = c.get("role");
      if (role !== "student")
        return c.json({ message: "Forbidden: STUDENT only" }, 403);

      const userId = c.get("userId");
      if (!userId) return c.json({ message: "Unauthorized" }, 401);

      const submissionId = String(formData.get("submissionId") ?? "");
      if (!submissionId)
        return c.json({ message: "submissionId is required" }, 400);
      if (!isValidUUID(submissionId))
        return c.json({ message: "submissionId must be a valid UUID" }, 400);

      const deliverableId = String(formData.get("deliverableId") ?? "");
      if (!deliverableId)
        return c.json({ message: "deliverableId is required" }, 400);
      if (!isValidUUID(deliverableId))
        return c.json({ message: "deliverableId must be a valid UUID" }, 400);

      const assignment = await SubmissionModel.getAssignmentBySubmission(
        submissionId
      );
      if (!assignment?.id)
        return c.json({ message: "assignmentId is required" }, 400);
      if (!isValidUUID(assignment.id))
        return c.json({ message: "assignmentId must be a valid UUID" }, 400);

      const courseId = await SubmissionModel.getCourseIdByAssignment(
        assignment.id
      );
      if (!courseId) {
        return c.json(
          { message: "No course found for the given assignmentId" },
          400
        );
      }
      if (!isValidUUID(courseId))
        return c.json({ message: "courseId must be a valid UUID" }, 400);

      const cm = await prisma.courseMember.findUnique({
        where: { courseId_userId: { courseId, userId } },
        select: { id: true },
      });
      if (!cm)
        return c.json({ message: "You are not a member of this course" }, 403);

      const memberships = await prisma.groupMember.findMany({
        where: { courseMemberId: cm.id },
        select: {
          group: {
            select: { id: true, projectName: true },
          },
        },
        orderBy: { groupId: "asc" },
      });
      if (memberships.length === 0) {
        return c.json(
          { message: "You are not in any group for this course" },
          400
        );
      }
      if (memberships.length > 1) {
        return c.json(
          {
            error:
              "You belong to multiple groups in this course. Please ask staff to resolve.",
            groupIds: memberships.map((m) => m.group.id),
          },
          409
        );
      }
      const groupId = memberships[0].group.id;
      //ต้องแก้ cs ใช้ product name dsi ใช้ project name
      const groupName = memberships[0].group.projectName;
      if (!isValidUUID(groupId))
        return c.json({ message: "groupId must be a valid UUID" }, 400);

      const allowed = await prisma.allowedFileType.findMany({
        where: { deliverableId },
        select: { mime: true },
      });
      if (allowed.length === 0) {
        return c.json(
          { message: "No allowed file types configured for this deliverable" },
          400
        );
      }
      const allowedMimes = new Set(
        allowed
          .map((a) => a.mime?.toLowerCase())
          .filter((mime): mime is string => Boolean(mime))
      );
      if (allowedMimes.size === 0) {
        return c.json(
          {
            message:
              "Allowed file type configuration is invalid for this deliverable",
          },
          400
        );
      }

      const file = formData.get("file") as File | null;
      if (!file) return c.json({ message: "No file uploaded" }, 400);
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
      if (!ext) {
        return c.json(
          { message: "Uploaded file must include an extension" },
          400
        );
      }
      if (BLOCK_EXT.has(ext)) {
        return c.json(
          { message: `Disallowed file extension: .${ext}` },
          400
        );
      }

      const buf = new Uint8Array(await file.arrayBuffer());

      const sniffed = sniffBinaryMime(buf, ext);
      const clientType = (file.type || "").toLowerCase();
      if (clientType && BLOCK_MIME.has(clientType)) {
        return c.json(
          { message: `Dangerous MIME is not allowed: ${clientType}` },
          400
        );
      }

      const guessedMime = ALLOW_EXT_TO_MIME[ext];
      let finalMime: string | null = sniffed || clientType || guessedMime || null;
      if (finalMime) {
        finalMime = finalMime.toLowerCase();
      }

      if (!finalMime) {
        return c.json(
          { message: "Cannot determine file type; upload rejected" },
          415
        );
      }

      if (STRICT_MIME_VALIDATION.has(finalMime) && sniffed !== finalMime) {
        return c.json(
          { message: "File content does not match declared type" },
          415
        );
      }

      if (!allowedMimes.has(finalMime)) {
        return c.json(
          {
            message: "File type not allowed for this deliverable",
            receivedMime: finalMime,
            allowedMimes: [...allowedMimes],
            shouldRemoveClientFile: true,
          },
          400
        );
      }

      const unique = `${uuidv4()}.${ext || "bin"}`;
      const objectKey = `course-${courseId}/assignment-${assignment.id}/deliverable-${deliverableId}/group-${groupId}/submission-${submissionId}/${unique}`;

      const putKey = await uploadToMinio(
        objectKey,
        Buffer.from(buf),
        finalMime
      );
      const publicUrl = buildPublicFileUrl(putKey, file.name, origin);

      const newFile = await SubmissionModel.createSubmissionFile({
        submissionId,
        deliverableId,
        fileUrl: publicUrl,
        name: file.name,
      });

      //mail
      //const mailStudentUsersSubmission = await mailRoles.getAllStudentsInGroup(
      //   groupId
      // );
      const mailStudentUsersSubmission = await mailRoles.test2("stf02");
      await mailSentAndSummary(mailStudentUsersSubmission, async (u) => {
        const name = u?.user?.name ?? u?.name ?? "Student";
        return submissionMail.createStudentSubmissionMail(
          assignment,
          groupId,
          groupName,
          submissionId,
          name
        );
      });

      // const mailLecturerUsersSubmission = await mailRoles.getAllAdvisorsInGroup(
      //   groupId
      // );
      const mailLecturerUsersSubmission = await mailRoles.test2("stf02");
      await mailSentAndSummary(mailLecturerUsersSubmission, async (u) => {
        const name = u?.user?.name ?? u?.name ?? "Lecturer";
        return submissionMail.createLecturerSubmissionMail(
          assignment,
          groupId,
          groupName,
          submissionId,
          name
        );
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
      const origin = getRequestOrigin(c);
      const formData = await c.req.formData();

      const role = c.get("role");
      if (role !== "lecturer") {
        return c.json({ message: "Forbidden: LECTURER only" }, 403);
      }
      const feedbackId = String(formData.get("feedbackId") ?? "");
      if (!feedbackId) return c.json({ message: "feedbackId is required" }, 400);
      if (!isValidUUID(feedbackId))
        return c.json({ message: "feedbackId must be a valid UUID" }, 400);

      const submissionId = await SubmissionModel.getSubmissionByFeedback(
        feedbackId
      );
      if (!submissionId)
        return c.json({ message: "submissionId is required" }, 400);
      if (!isValidUUID(submissionId))
        return c.json({ message: "submissionId must be a valid UUID" }, 400);

      const assignment = await SubmissionModel.getAssignmentBySubmission(
        submissionId
      );
      if (!assignment?.id)
        return c.json({ message: "assignmentId is required" }, 400);
      if (!isValidUUID(assignment.id))
        return c.json({ message: "assignmentId must be a valid UUID" }, 400);

      const courseId = await SubmissionModel.getCourseIdByAssignment(
        assignment.id
      );
      if (!courseId) return c.json({ message: "courseId is required" }, 400);
      if (!isValidUUID(courseId))
        return c.json({ message: "courseId must be a valid UUID" }, 400);

      const deliverableId = String(formData.get("deliverableId") ?? "");
      if (!deliverableId)
        return c.json({ message: "deliverableId is required" }, 400);
      if (!isValidUUID(deliverableId))
        return c.json({ message: "deliverableId must be a valid UUID" }, 400);

      const groupId = String(formData.get("groupId") ?? "");
      if (!groupId) return c.json({ message: "groupId is required" }, 400);
      if (!isValidUUID(groupId))
        return c.json({ message: "groupId must be a valid UUID" }, 400);
      const groupName = await SubmissionModel.getGroupNameById(groupId);
      if (!groupName)
        return c.json(
          { message: "Cannot find group with the given groupId" },
          400
        );

      const file = formData.get("file") as File | null;
      if (!file) return c.json({ message: "No file uploaded" }, 400);

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
          { message: `Disallowed file extension: .${ext || "(none)"}` },
          400
        );
      }
      const allowedMimeByExt = ALLOW_EXT_TO_MIME[ext];
      if (!allowedMimeByExt) {
        return c.json({ message: `File type not allowed: .${ext}` }, 400);
      }

      const arrayBuf = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);

      const clientType = (file.type || "").toLowerCase();
      if (clientType && BLOCK_MIME.has(clientType)) {
        return c.json(
          { message: `Dangerous MIME is not allowed: ${clientType}` },
          400
        );
      }

      const sniffed = sniffBinaryMime(bytes, ext);
      let finalMime = allowedMimeByExt;
      if (sniffed) {
        if (sniffed !== allowedMimeByExt) {
          return c.json(
            { message: "File content does not match declared type" },
            400
          );
        }
        finalMime = sniffed;
      }

      const uniqueFileName = `${uuidv4()}.${ext}`;
      const objectKey =
        `course-${courseId}/assignment-${assignment.id}/deliverable-${deliverableId}` +
        `/group-${groupId}/submission-${submissionId}/feedbackId-${feedbackId}/${uniqueFileName}`;

      const putKey = await uploadToMinio(
        objectKey,
        Buffer.from(arrayBuf),
        finalMime
      );

      const publicUrl = buildPublicFileUrl(putKey, file.name, origin);

      const newFile = await FeedbackModel.createFeedbackFile({
        feedbackId,
        deliverableId,
        fileUrl: publicUrl,
        name: file.name,
      });

      const userId = c.get("userId");
      if (!userId) return c.json({ message: "Unauthorized" }, 401);
      //mail
      // const mailStudentUsersSubmission = await mailRoles.getAllStudentsInGroup(
      //   groupId
      // );
      const mailStudentUsersSubmission = await mailRoles.test2("stf02");
      const { subject, html, text } =
        await feedbackMail.createStudentFeedbackMail(
          assignment.name,
          groupName.projectName,
          submissionId,
          userId
        );
      await mailSentAndSummary(mailStudentUsersSubmission, subject, html, text);

      // const mailLecturerUsersSubmission = await mailRoles.getAllAdvisorsInGroup(
      //   groupId
      // );
      const mailLecturerUsersSubmission = await mailRoles.test2("stf02");
      const {
        subject: sub2,
        html: html2,
        text: text2,
      } = await feedbackMail.createLecturerFeedbackMail(
        assignment.name,
        groupName.projectName,
        submissionId,
        userId
      );
      await mailSentAndSummary(mailLecturerUsersSubmission, sub2, html2, text2);

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
function getRequestOrigin(c: Context): string {
  const url = new URL(c.req.url);
  return ensureOrigin(url.origin);
}
