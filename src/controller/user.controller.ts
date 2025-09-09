import { Context } from "hono";
import UserModel from "../model/user.model";
import * as XLSX from "xlsx";
import { decodeToken, getTokenFromHeader } from "../util/jwt";

const Roles = new Set(["STUDENT", "LECTURER", "STAFF", "SUPER_ADMIN"]);
const Programs = new Set(["CS", "DSI", "BOTH"]);

export const UserController = {
  // GET /user/my-project/course/:courseId
  getMyProjectByCourse: async (c: Context) => {
    try {
      const userId = c.get("userId");
      const role = c.get("role");
      if (!userId) return c.json({ message: "Unauthorized" }, 401);

      const courseId = c.req.param("courseId");
      if (!Number.isFinite(courseId)) {
        return c.json({ message: "Invalid courseId" }, 400);
      }

      if (role !== "student") {
        return c.json({ message: "Forbidden: STUDENT only" }, 403);
      }

      const result = await UserModel.getStudentProjectByCourse(
        userId,
        courseId
      );
      return c.json(
        {
          group: result.group,
          projectName: result.group.projectName,
          productName: result.group.productName,
          company: result.group.company,
        },
        200
      );
    } catch (err: any) {
      const status = err?.status ?? 500;
      const message = err?.message ?? "Internal server error";
      if (status >= 500) console.error("getMyProjectByCourse error:", err);
      return c.json({ message }, status);
    }
  },

  uploadUserDataByExcel: async (c: Context) => {
    try {
      const form = await c.req.parseBody();
      const file = form["file"];
      const role = String(form["role"] ?? "");
      const program = String(form["program"] ?? "");

      if (!(file instanceof File)) {
        return c.json({ message: "Missing file (field name 'file')" }, 400);
      }
      if (!Roles.has(role)) {
        return c.json(
          { message: "Invalid role. Use STUDENT|LECTURER|STAFF|SUPER_ADMIN" },
          400
        );
      }
      if (!Programs.has(program)) {
        return c.json({ message: "Invalid program. Use CS|DSI|BOTH" }, 400);
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buf, { type: "buffer" });
      const wsName = wb.SheetNames[0];
      if (!wsName) {
        return c.json({ message: "Excel file has no sheets" }, 400);
      }
      const ws = wb.Sheets[wsName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Array<
        Record<string, any>
      >;

      if (!rows.length) {
        return c.json({ message: "Excel sheet is empty" }, 400);
      }

      const normalized = rows.map((r, idx) => {
        const keys = Object.keys(r).reduce((acc, k) => {
          acc[k.toLowerCase().trim()] = k;
          return acc;
        }, {} as Record<string, string>);

        const kId = keys["id"];
        const kEmail = keys["email"];
        const kName = keys["name"]; 

        const rawId = kId ? r[kId] : "";
        const email = kEmail ? String(r[kEmail]).trim() : "";
        const name = kName ? String(r[kName]).trim() : "";

        return { rowNumber: idx + 2, id: String(rawId).trim(), email, name };
      });

      const invalids = normalized.filter((x) => !x.id || !x.email || !x.name);
      if (invalids.length) {
        return c.json(
          {
            message: "Invalid rows found",
            details: invalids.map((x) => ({
              row: x.rowNumber,
              id: x.id || "<missing>",
              email: x.email || "<missing>",
              name: x.name || "<missing>",
            })),
          },
          400
        );
      }

      const result = await UserModel.uploadStudentDataByExcel({
        rows: normalized,
        role: role as any,
        program: program as any, 
      });

      return c.json(
        {
          message: "Users have been processed successfully",
          summary: result.summary,
          errors: result.errors, 
        },
        200
      );
    } catch (error) {
      console.error({
        context: "uploadStudentDataByExcel",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },
};
