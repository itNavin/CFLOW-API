import type { Context } from "hono";
import { downloadFromMinio } from "src/lib/minio";
import {
  decodePublicFileToken,
  guessMimeFromName,
} from "src/util/storage";

function buildContentDisposition(
  filename: string,
  mode: "inline" | "attachment"
): string {
  const sanitized = filename.replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(filename);
  const hasUtf8 = encoded !== sanitized;
  return hasUtf8
    ? `${mode}; filename="${sanitized}"; filename*=utf-8''${encoded}`
    : `${mode}; filename="${sanitized}"`;
}

export const PublicFileController = {
  serve: async (c: Context) => {
    try {
      const token = c.req.param("token");
      if (!token) {
        return c.json({ message: "File token is required" }, 400);
      }

      let objectKey: string;
      try {
        objectKey = decodePublicFileToken(token);
      } catch {
        return c.json({ message: "Invalid file token" }, 400);
      }

      const filenameParam = c.req.param("filename");
      const filename =
        filenameParam ||
        objectKey.split("/").pop() ||
        "file";
      const mime = guessMimeFromName(filename);
      const mode =
        (c.req.query("mode") || "").toLowerCase() === "download" ||
        (c.req.query("download") || "") === "1"
          ? "attachment"
          : "inline";

      const buffer = await downloadFromMinio(objectKey);
      const headers = new Headers();
      headers.set("Content-Type", mime);
      headers.set("Content-Length", buffer.byteLength.toString());
      headers.set(
        "Content-Disposition",
        buildContentDisposition(filename, mode)
      );
      headers.set("Cache-Control", "private, max-age=0, must-revalidate");

      return new Response(buffer as any, { status: 200, headers });
    } catch (error: any) {
      const code = error?.code || error?.name;
      if (code === "NoSuchKey") {
        return c.json({ message: "File not found" }, 404);
      }

      console.error({
        context: "PublicFileController.serve",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Failed to retrieve file" },
        500
      );
    }
  },
};

