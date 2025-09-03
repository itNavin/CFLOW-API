import { prisma } from "../prisma";
import type { Prisma, Role } from "@prisma/client";

class AuthModel {
  static async createUser(data: {
    id: string;
    email: string;
    role: Role;
    name: string;
  }){
    return prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        role: data.role,
        name: data.name,
      },
    });
  }
}

export { AuthModel };