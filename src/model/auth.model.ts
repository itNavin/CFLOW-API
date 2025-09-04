import { prisma } from "../prisma";
import type { Prisma, Role } from "@prisma/client";

class AuthModel {
  static async createUser(data: {
    id: string;
    email: string;
    name: string;
    role: Role;
  }){
    return prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
      },
    });
  }
}

export { AuthModel };