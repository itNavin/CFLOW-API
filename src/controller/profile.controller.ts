import type { Context } from "hono";
import ProfileModel from "src/model/profile.model";
import { isValidUUID } from "../types/uuid";

export const ProfileController = {
  getProfile: async (c: Context) => {
    try {
      const userId = c.get("userId");
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const role = c.get("role");
      if (role != "student" && role != "staff" && role != "lecturer") {
        return c.json(
          { message: "Forbidden: students, staff, and lecturers only" },
          403
        );
      }

      const profile = await ProfileModel.getProfile(userId);

      return c.json(
        {
          message: "Profile retrieved successfully",
          profile: profile,
        },
        200
      );
    } catch (error: any) {
      console.error({
        context: "getProfile",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return c.json(
        { message: "Internal server error. Please try again later." },
        500
      );
    }
  },

  getProfileByUserId: async (c: Context) => {
    try {
      const userId = c.req.param("userId");
      if (!userId) {
        return c.json({ message: "userId is required" }, 400);
      }

      const role = c.get("role");
      if (role != "staff") {
        return c.json({ message: "Forbidden: staff only" }, 403);
      }

      const profile = await ProfileModel.getProfile(userId);

      return c.json(
        {
          message: "Profile retrieved successfully",
          profile: profile,
        },
        200
      );
    } catch (error: any) {
      console.error({
        context: "getProfileByUserId",
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
