import { Context } from "hono";
import UserModel from "../model/user.model";

export const UserController = {
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

  getAllUsers: async (c: Context) => {
    try {
      const users = await UserModel.getAllUsers();
      return c.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  },

  getUserById: async (c: Context) => {
    try {
      const idParam = c.req.param("id");
      const id = Number(idParam);

      if (isNaN(id)) {
        return c.json({ message: "Invalid user ID" }, 400);
      }

      const user = await UserModel.getUserById(id);
      if (!user) {
        return c.json({ message: "User not found" }, 404);
      }

      return c.json(user);
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return c.json({ message: "Internal server error" }, 500);
    }
  },
};
