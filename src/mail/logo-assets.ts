import fs from "node:fs";
import path from "node:path";

function loadLogoDataUri(filename: string): string | null {
  try {
    const filePath = path.resolve(process.cwd(), "src", "assets", filename);
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.warn(`[mail][logos] failed to load ${filename}:`, error);
    return null;
  }
}

export const SIT_LOGO_SRC = loadLogoDataUri("SIT-LOGO.png");
export const CFLOW_LOGO_SRC = loadLogoDataUri("C-Flow-LOGO.png");
