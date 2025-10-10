// storage.utils.ts
import * as Minio from "minio";
import { ALLOW_EXT_TO_MIME } from "../controller/storage.controller";

const bucketName = Bun.env.MINIO_BUCKET ?? "";
const minioClient = new Minio.Client({
  endPoint: Bun.env.MINIO_ENDPOINT ?? "",
  accessKey: Bun.env.MINIO_ACCESS ?? "",
  secretKey: Bun.env.MINIO_SECRET ?? "",
  port: 9000,
  useSSL: false,
});

export function extractObjectKeyFromAbsoluteUrl(url: string): string {
  // absolute form: http://host:9000/<bucket>/<objectKey...>
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  // parts[0] = bucket, rest = objectKey segments
  if (parts.length < 2) throw new Error("Invalid MinIO URL");
  return parts.slice(1).join("/");
}

export async function presignGetObject(
  objectKey: string,
  {
    disposition = "inline", // "inline" | "attachment"
    filename,
    mime,
    expires = 7 * 24 * 60 * 60,
  }: {
    disposition?: "inline" | "attachment";
    filename?: string;
    mime?: string;
    expires?: number;
  } = {}
): Promise<string> {
  const reqParams: Record<string, string> = {};
  // content-disposition
  if (disposition === "attachment") {
    const name = filename
      ? encodeURIComponent(filename)
      : encodeURIComponent(objectKey.split("/").pop() || "download");
    reqParams[
      "response-content-disposition"
    ] = `attachment; filename="${name}"`;
  } else {
    reqParams["response-content-disposition"] = "inline";
  }
  // optional content-type hint
  if (mime) reqParams["response-content-type"] = mime;

  return minioClient.presignedGetObject(
    bucketName,
    objectKey,
    expires,
    reqParams
  );
}

// helper to extract extension safely (handles uppercase, spaces, no ext)
function getExt(name?: string): string | undefined {
  if (!name) return;
  const n = name.trim().toLowerCase();
  const dot = n.lastIndexOf(".");
  if (dot < 0 || dot === n.length - 1) return;
  return n.slice(dot + 1);
}

export function guessMimeFromName(name?: string): string {
  const ext = getExt(name);
  return ext && ALLOW_EXT_TO_MIME[ext]
    ? ALLOW_EXT_TO_MIME[ext]
    : "application/octet-stream";
}

