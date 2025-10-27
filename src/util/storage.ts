// storage.utils.ts
import * as Minio from "minio";

export const ALLOW_EXT_TO_MIME: Record<string, string> = {
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

const bucketName = Bun.env.MINIO_BUCKET ?? "";
const minioClient = new Minio.Client({
  endPoint: Bun.env.MINIO_ENDPOINT ?? "",
  accessKey: Bun.env.MINIO_ACCESS ?? "",
  secretKey: Bun.env.MINIO_SECRET ?? "",
  port: 9000,
  useSSL: false,
});

export const PUBLIC_FILES_ROUTE_PREFIX = "/api/public/files";

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

function parseUrlMaybe(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function tryDecodePublicFilePath(pathname: string): string | null {
  const normalisedPath = pathname.startsWith("/")
    ? pathname
    : `/${pathname}`;
  if (!normalisedPath.startsWith(PUBLIC_FILES_ROUTE_PREFIX)) return null;
  let rest = normalisedPath.slice(PUBLIC_FILES_ROUTE_PREFIX.length);
  if (rest.startsWith("/")) rest = rest.slice(1);
  if (!rest) {
    throw new Error("Missing encoded file token");
  }
  const [token] = rest.split("/");
  if (!token) {
    throw new Error("Missing encoded file token");
  }
  try {
    return fromBase64Url(token);
  } catch (error) {
    throw new Error("Invalid file token provided");
  }
}

export function buildPublicFileUrl(
  objectKey: string,
  filename?: string,
  origin?: string,
  options?: {
    mode?: "inline" | "download";
  }
): string {
  const encodedKey = toBase64Url(objectKey);
  const namePart = filename ? `/${encodeURIComponent(filename)}` : "";
  const baseOrigin = ensureOrigin(origin);
  const params = new URLSearchParams();
  if (options?.mode) params.set("mode", options.mode);
  const query = params.toString();
  const queryPart = query ? `?${query}` : "";
  return `${baseOrigin}${PUBLIC_FILES_ROUTE_PREFIX}/${encodedKey}${namePart}${queryPart}`;
}

export function extractObjectKeyFromAbsoluteUrl(url: string): string {
  const parsed = parseUrlMaybe(url);
  if (parsed) {
    // new public file endpoint
    const tokenKey = tryDecodePublicFilePath(parsed.pathname);
    if (tokenKey) return tokenKey;
    // legacy absolute form: http://host:9000/<bucket>/<objectKey...>
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) throw new Error("Invalid MinIO URL");
    return parts.slice(1).join("/");
  }

  // handle relative URLs (new format)
  const relativeKey = tryDecodePublicFilePath(url.split("?")[0]);
  if (relativeKey) return relativeKey;

  throw new Error("Unsupported file URL format");
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

export function decodePublicFileToken(token: string): string {
  return fromBase64Url(token);
}

export function ensureOrigin(originCandidate?: string): string {
  if (originCandidate && originCandidate.trim()) {
    return originCandidate.replace(/\/+$/, "");
  }
  const fallback =
    Bun.env.PUBLIC_FILE_BASE_URL ||
    Bun.env.PUBLIC_BASE_URL ||
    "";
  return fallback.replace(/\/+$/, "");
}

