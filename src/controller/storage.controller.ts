import type { Context } from "hono";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { s3, S3_BUCKET, S3_PUBLIC_BASE_URL } from "../lib/s3";
import FileModel from "../model/file.model";

// Helper to build a key:
// e.g. files/course/12/ann/45/<uuid>-report.pdf  OR  files/course/12/user/7/<uuid>-avatar.png
function buildKey(opts: {
  courseId: number;
  announcementId?: number;
  userId?: number;
  filename: string;
}) {
  const safeName = opts.filename.replace(/[^\w.\-]+/g, "_");
  const uuid = randomUUID();
  if (opts.announcementId) {
    return `files/course/${opts.courseId}/ann/${opts.announcementId}/${uuid}-${safeName}`;
  }
  return `files/course/${opts.courseId}/user/${
    opts.userId ?? "unknown"
  }/${uuid}-${safeName}`;
}

export const StorageController = {
  // POST /storage/presign-upload/course/:courseId
  // body: { filename, contentType, announcementId? }
  presignUpload: async (c: Context) => {
    const userId = c.get("userId");
    const role = c.get("role");
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    if (!["ADVISOR", "ADMIN", "SUPER_ADMIN", "STUDENT"].includes(role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const courseId = Number(c.req.param("courseId"));
    if (!Number.isFinite(courseId) || courseId <= 0) {
      return c.json({ error: "Invalid courseId" }, 400);
    }

    const body = await c.req.json<any>();
    const filename = String(body.filename ?? "").trim();
    const contentType = String(body.contentType ?? "application/octet-stream");
    const announcementId =
      body.announcementId != null ? Number(body.announcementId) : undefined;

    if (!filename) return c.json({ error: "filename is required" }, 400);

    const key = buildKey({ courseId, announcementId, userId, filename });

    // 1) sign PUT
    const putCmd = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: 60 * 5 }); // 5 min

    // 2) sign GET (optional convenience)
    const getCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const downloadUrl = await getSignedUrl(s3, getCmd, { expiresIn: 60 * 10 }); // 10 min

    // 3) Optionally pre-create a DB row (status=pending). Or create after client confirms upload:
    // Here we do it AFTER client uploads: client calls /storage/confirm to write DB.

    return c.json({
      bucket: S3_BUCKET,
      key,
      uploadUrl,
      downloadUrl,
      publicUrl: S3_PUBLIC_BASE_URL
        ? `${S3_PUBLIC_BASE_URL}/${key}`
        : undefined,
      expiresInSec: 300,
    });
  },

  // POST /storage/confirm
  // body: { courseId, announcementId?, key, originalName }
  confirmUpload: async (c: Context) => {
    const userId = c.get("userId");
    const role = c.get("role");
    if (!userId) return c.json({ error: "Unauthorized" }, 401);
    if (!["ADVISOR", "ADMIN", "SUPER_ADMIN", "STUDENT"].includes(role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const body = await c.req.json<any>();
    const courseId = Number(body.courseId);
    const announcementId =
      body.announcementId != null ? Number(body.announcementId) : undefined;
    const key = String(body.key ?? "").trim();
    const originalName = String(body.originalName ?? "").trim();

    if (!Number.isFinite(courseId) || courseId <= 0)
      return c.json({ error: "Invalid courseId" }, 400);
    if (!key) return c.json({ error: "key is required" }, 400);
    if (!originalName)
      return c.json({ error: "originalName is required" }, 400);

    // Save to your File table. You currently keep "filepath"; store S3 key in it.
    const file = await FileModel.createFile({
      name: originalName,
      filepath: key, // store the S3 key (or use s3://bucket/key)
      createdById: userId,
      courseId,
      announcementId,
    });

    return c.json(file, 201);
  },

  // GET /storage/presign-download?key=...
  presignDownload: async (c: Context) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const url = new URL(c.req.url);
    const key = String(url.searchParams.get("key") ?? "");
    if (!key) return c.json({ error: "key is required" }, 400);

    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const downloadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 });
    return c.json({ downloadUrl, expiresInSec: 600 });
  },
};
