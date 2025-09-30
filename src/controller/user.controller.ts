import { Context } from "hono";
import UserModel from "../model/user.model";
import * as XLSX from "xlsx";
import { isValidUUID } from "src/types/uuid";

const Roles = new Set(["student", "lecturer", "staff", "super_admin"]);
const Programs = new Set(["CS", "DSI", "BOTH"]);

export const UserController = {
  // GET /user/my-project/course/:courseId
  getMyProjectByCourse: async (c: Context) => {
    try {
      const userId = c.get("userId");
      const role = c.get("role");
      if (!userId) return c.json({ message: "Unauthorized" }, 401);

      const courseId = c.req.param("courseId");
      if (!courseId) {
        return c.json({ message: "courseId is required" }, 400);
      }
      if (!isValidUUID(courseId)) {
        return c.json({ message: "Invalid courseId (UUID expected)" }, 400);
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
  createStaffUser: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }
      const body = await c.req.json();
      const { email, name, program } = body;
      if ( !email || !name || !program) {
        return c.json({ message: "Missing required fields" }, 400);
      }
      const id = email.split("@")[0];
      const createStaffUser = await UserModel.createStaffUser(
        id,
        email,
        name,
        program
      );
      return c.json(
        {
          message: "Staff user created successfully",
          user: createStaffUser,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "createStaffUser",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  createLecturerUser: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }
      const body = await c.req.json();
      const { id, email, name, program } = body;
      if (!id || !email || !name || !program) {
        return c.json({ message: "Missing required fields" }, 400);
      }
      const createLecturerUser = await UserModel.createLecturerUser(
        id,
        email,
        name,
        program
      );
      return c.json(
        {
          message: "Lecturer user created successfully",
          user: createLecturerUser,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "createLecturerUser",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  createSolarLecturerUser: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const body = await c.req.json();
      const { email, name, program } = body;
      if (!email || !name || !program) {
        return c.json({ message: "Missing required fields" }, 400);
      }

      const id = "Sol#" + email.split("@")[0];
      const rawPassword = Math.random().toString(36).slice(-8); // temporary password
      // hash
      const hashedPassword = await Bun.password.hash(rawPassword, {
        algorithm: "bcrypt",
        cost: 10,
      });

      console.log("id:", id);
      console.log("raw password:", rawPassword);

      const createSolarLecturerUser = await UserModel.createSolarLecturerUser(
        id,
        email,
        name,
        hashedPassword,
        program
      );

      return c.json(
        {
          message: "Lecturer user created successfully",
          user: createSolarLecturerUser,
          tempPassword: rawPassword,
        },
        201
      );
    } catch (error) {
      console.error({
        context: "createSolarLecturerUser",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  updateSolarPassword: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "lecturer ") {
        return c.json({ message: "Forbidden: LECTURER only" }, 403);
      }

      const body = await c.req.json();
      const { userId, newPassword } = body;
      if (!userId || !newPassword) {
        return c.json({ message: "Missing required fields" }, 400);
      }
      if (userId.startsWith("Sol#") === false) {
        return c.json({ message: "Not a solar user" }, 400);
      }

      const hashedPassword = await Bun.password.hash(newPassword, {
        algorithm: "bcrypt",
        cost: 10,
      });

      const updatedUser = await UserModel.updateSolarPassword(
        userId,
        hashedPassword
      );
      if (!updatedUser) {
        return c.json({ message: "User not found" }, 404);
      }

      return c.json({ message: "Password updated successfully" }, 200);
    } catch (error) {
      console.error({
        context: "updateSolarPassword",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  getAllUsers: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const users = await UserModel.getAllUsers();
      return c.json(users, 200);
    } catch (error) {
      console.error({
        context: "getAllUsers",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  fetchStudentData: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }

      const academicYear = c.req.query("academicYear");
      if (!academicYear) {
        return c.json({ message: "academicYear is required" }, 400);
      }

      const baseUrl = process.env.STUDENT_FETCH_DATA_URL;
      if (!baseUrl) {
        return c.json(
          { message: "STUDENT_FETCH_DATA_URL is not configured" },
          500
        );
      }

      const data = await fetch(
        `${baseUrl}/api/v1/users/profile/studentsFromYear?academicYear=${academicYear}`
      );
      const json = await data.json();
      const rows = Array.isArray(json) ? json : json?.data ?? [];

      const acceptedPrograms = new Set([
        "Bachelor of Science Program in Computer Science (English Program)",
        "Bachelor of Arts Programme in Digital Service Innovation",
      ]);

      const filtered = rows.filter(
        (r: any) =>
          String(r?.statusName ?? "").trim() === "กำลังศึกษาอยู่" &&
          acceptedPrograms.has(String(r?.programNameEng ?? "").trim())
      );

      // Insert (your model can still do its own validation/dedupe)
      const summary = await UserModel.fetchStudentDataFromAPI(filtered);

      return c.json(
        {
          message: "Student data has been processed successfully",
          summary,
          data: filtered, // ← now only shows allowed rows
        },
        200
      );
    } catch (error) {
      console.error({
        context: "fetchStudentData",
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
