export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function normalizeGroupCode(code: string, width = 4) {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) return "";
  return /^\d+$/.test(trimmed) ? trimmed.padStart(width, "0") : trimmed;
}

export const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/zip": "zip",
  "text/plain": "txt",
};

const WILDCARD_FALLBACK: Record<string, string> = {
  "image/*": "jpg",
  "application/*": "bin",
  "text/*": "txt",
};

function extFromMime(mime: string): string | undefined {
  const m = mime.toLowerCase();
  if (MIME_TO_EXT[m]) return MIME_TO_EXT[m];
  const fam = `${m.split("/")[0]}/*`;
  return WILDCARD_FALLBACK[fam];
}

export function changeFilename(opts: {
  groupCode: string; 
  deliverableName: string; 
  version: number;
  mime: string; 
  partIndex?: number; 
}) {
  const { groupCode, deliverableName, version, mime, partIndex } = opts;

  const code = normalizeGroupCode(groupCode);
  if (!code) throw new Error("groupCode is required");

  const deliverableSlug = slugify(deliverableName);
  if (!deliverableSlug) throw new Error("deliverableName is required");

  if (!Number.isFinite(version) || version <= 0) {
    throw new Error("version must be a positive number");
  }

  const v = pad2(version);
  const p = partIndex ? `_P${pad2(partIndex)}` : "";

  const ext = extFromMime(mime);
  if (!ext) throw new Error(`Unsupported MIME type: ${mime}`);

  return `G${code}_${deliverableSlug}_V${v}${p}.${ext}`;
}

export function buildObjectKey(opts: {
  courseId: number;
  assignmentId: number;
  groupCode: string;
  version: number;
  filename: string; 
}) {
  const code = normalizeGroupCode(opts.groupCode);
  const v = `V${pad2(opts.version)}`;
  return [
    `course-${opts.courseId}`,
    `assignment-${opts.assignmentId}`,
    `G${code}`,
    v,
    opts.filename,
  ].join("/");
}
