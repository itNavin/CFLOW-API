import { Context } from "hono";
import UserModel from "../model/user.model";
import { decodeToken, getTokenFromHeader } from "../util/jwt";

export const UserController = {
  // POST /user/createUser
  createUser: async (c: Context) => {
    try {
      const body = await c.req.json();
      const { email, passwordHash, prefix, name, surname, role } = body;

      if (!email || !passwordHash || !prefix || !name || !surname || !role) {
        return c.json({ message: "Missing required fields" }, 400);
      }

      const user = await UserModel.createUser(
        email,
        passwordHash,
        prefix,
        name,
        surname,
        role
      );

      return c.json(user, 201);
    } catch (error) {
      console.error("Error creating user:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  },

  // GET /user/users
  getAllUsers: async (c: Context) => {
    try {
      const users = await UserModel.getAllUsers();
      return c.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  },

  // GET /user/
  getUserById: async (c: Context) => {
    try {
      const token = getTokenFromHeader(c.req.header("Authorization"));
      if (!token) {
        return c.json({ message: "Unauthorized: missing token" }, 401);
      }

      const payload = decodeToken(token);
      const userId = payload.userId;

      const user = await UserModel.getUserById(userId);
      if (!user) {
        return c.json({ message: "User not found" }, 404);
      }

      return c.json(user, 200);
    } catch (error: any) {
      console.error("Error fetching user from token:", error);
      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
      ) {
        return c.json(
          { message: "Unauthorized: invalid or expired token" },
          401
        );
      }
      return c.json({ message: "Internal server error" }, 500);
    }
  },

  // GET /user/my-project/course/:courseId
  getMyProjectByCourse: async (c: Context) => {
    try {
      const userId = c.get("userId");
      const role = c.get("role");
      if (!userId) return c.json({ message: "Unauthorized" }, 401);

      const courseId = Number(c.req.param("courseId"));
      if (!Number.isFinite(courseId)) {
        return c.json({ message: "Invalid courseId" }, 400);
      }

      if (role !== "STUDENT") {
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
};
