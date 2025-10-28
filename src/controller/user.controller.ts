import { Context } from "hono";
import UserModel from "../model/user.model";
import { isValidUUID } from "src/types/uuid";
import { prisma } from "../prisma";
import { mailRoles } from "src/util/mailRole";
import { mailSentAndSummary } from "src/util/mailSummary";
import { userMail } from "src/mail/user.mail";
import { randomBytes, createHash } from "crypto";
import crypto from "node:crypto";
import { Role } from "../types/role";

function makeToken() {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}
const sha256 = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");

export async function verifyResetTokenAndGetUserId(
  rawToken: string
): Promise<string> {
  const tokenHash = sha256(rawToken);
  const rec = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true },
  });
  if (!rec) throw new Error("Invalid or expired token");
  return rec.userId;
}

export async function markResetTokenUsed(rawToken: string): Promise<void> {
  const tokenHash = sha256(rawToken);
  await prisma.passwordResetToken.updateMany({
    where: { tokenHash, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export const UserController = {
  getAllStudentYears: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }
      const years = await UserModel.getAllStudentYears();
      return c.json(
        {
          message: "get all student years successfully",
          years,
        },
        200
      );
    } catch (err: any) {
      const status = err?.status ?? 500;
      const message = err?.message ?? "Internal server error";
      if (status >= 500) console.error("getAllStudentYears error:", err);
      return c.json({ message }, status);
    }
  },

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
          message: "get my project successfully",
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

  createStaffUser: async (c: Context) => {
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
      const isExisting = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (isExisting) {
        return c.json({ message: "Email already in use" }, 400);
      }
      const id = email.split("@")[0];
      const createStaffUser = await UserModel.createStaffUser(
        id,
        email,
        name,
        program
      );

      const { subject, html, text } = await userMail.createStaffUserMail({
        user: {
          id: createStaffUser.id,
          email: createStaffUser.email,
          name: createStaffUser.name,
          password: null,
          role: createStaffUser.role as Role,
          program: createStaffUser.program,
          createdAt: createStaffUser.createdAt,
        },
      });
      await mailSentAndSummary([createStaffUser], subject, html, text);

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
      const { email, name, program } = body;
      if (!email || !name || !program) {
        return c.json({ message: "Missing required fields" }, 400);
      }
      const isExisting = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (isExisting) {
        return c.json({ message: "Email already in use" }, 400);
      }
      const id = email.split("@")[0];
      const createLecturerUser = await UserModel.createLecturerUser(
        id,
        email,
        name,
        program
      );

      const { subject, html, text } = await userMail.createLecturerUserMail({
        user: {
          id: createLecturerUser.id,
          email: createLecturerUser.email,
          name: createLecturerUser.name,
          password: null,
          role: createLecturerUser.role as Role,
          program: createLecturerUser.program,
          createdAt: createLecturerUser.createdAt,
        },
      });
      await mailSentAndSummary([createLecturerUser], subject, html, text);

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
      const isExisting = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (isExisting) {
        return c.json({ message: "Email already in use" }, 400);
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
      console.log("finished creating user:", createSolarLecturerUser);
      const { raw, hash } = makeToken();
      await prisma.passwordResetToken.create({
        data: {
          userId: createSolarLecturerUser.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1h
        },
      });

      //mail
      // const mailUser = await mailRoles.test2("stf02");
      // console.log("mailUser:", mailUser);
      //const createdUser = mailUser;
      const createdUser = createSolarLecturerUser;
      const payload = {
        user: createdUser,
        tempPassword: rawPassword,
        token: raw,
      };

      const { subject, html, text } = await userMail.createSolarLecturerMail(
        payload,
        {
          frontendBaseUrl:
            process.env.FRONTEND_BASE_URL ?? "http://localhost:3000",
        }
      );

      await mailSentAndSummary([createdUser], subject, html, text);

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

  updateStaffAndLecturer: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }
      const body = await c.req.json();
      const { id, name, email } = body;
      if (!id || !name || !email) {
        return c.json({ message: "Missing required fields" }, 400);
      }
      const isNameExisting = await prisma.user.findUnique({
        where: { name },
        select: { id: true },
      });
      const isEmailExisting = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (isNameExisting && isNameExisting.id !== id) {
        return c.json({ message: "Name already in use" }, 400);
      }
      if (isEmailExisting && isEmailExisting.id !== id) {
        return c.json({ message: "Email already in use" }, 400);
      }
      let newId = email.split("@")[0];
      if( email.startsWith("Sol#")){
        newId = "Sol#" + email.split("@")[0];
      }

      const updated = await UserModel.updateStaffAndLecturer(id, newId, name, email);
      if (!updated) return c.json({ message: "User not found" }, 404);

      return c.json({ message: "User updated successfully" }, 200);
    } catch (error) {
      console.error({
        context: "updateStaffAndLecturer",
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
      const body = await c.req.json().catch(() => null);
      const token: string | undefined = body?.token;
      const oldPassword: string | undefined = body?.oldPassword;
      const newPassword: string | undefined = body?.newPassword;

      if (!token || !newPassword) {
        return c.json({ message: "Missing required fields" }, 400);
      }

      const userId = await verifyResetTokenAndGetUserId(token);

      if (!userId.startsWith("Sol#")) {
        return c.json({ message: "Not a solar user" }, 400);
      }

      if (oldPassword) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { password: true },
        });
        if (!user?.password)
          return c.json({ message: "User password not found" }, 400);

        const ok = await Bun.password.verify(oldPassword, user.password);
        if (!ok) return c.json({ message: "Invalid old password" }, 400);
      }

      const hashedPassword = await Bun.password.hash(newPassword, {
        algorithm: "bcrypt",
        cost: 10,
      });
      const updated = await UserModel.updateSolarPassword(
        userId,
        hashedPassword
      );
      if (!updated) return c.json({ message: "User not found" }, 404);

      await markResetTokenUsed(token);

      return c.json({ message: "Password updated successfully" }, 200);
    } catch (error) {
      console.error({ context: "updateSolarPassword", error: String(error) });
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

      const summary = await UserModel.fetchStudentDataFromAPI(filtered);

      return c.json(
        {
          message: "Student data has been processed successfully",
          summary,
          data: filtered,
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

  updateUserStatus: async (c: Context) => {
    try {
      const role = c.get("role");
      if (role !== "staff") {
        return c.json({ message: "Forbidden: STAFF only" }, 403);
      }
      const userId = c.get("userId");
      if (!userId) return c.json({ message: "Unauthorized" }, 401);
      const body = await c.req.json();
      const { targetUserId, status } = body;
      if (!targetUserId || !status) {
        return c.json({ message: "Missing required fields" }, 400);
      }
      const updatedUser = await UserModel.updateUserStatus(
        targetUserId,
        status
      );
      return c.json(
        {
          message: `${targetUserId} status updated to ${status} successfully`,
          user: updatedUser,
        },
        200
      );
    } catch (error) {
      console.error({
        context: "updateUserStatus",
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
