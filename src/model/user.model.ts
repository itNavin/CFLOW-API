import { prisma } from "../prisma";

class UserModel {
  static async createUser(
    email: string,
    passwordHash: string,
    prefix: string,
    name: string,
    surname: string,
    role: "STUDENT" | "ADVISOR" | "ADMIN" | "SUPER_ADMIN"
  ) {
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        prefix,
        name,
        surname,
        role,
      },
    });

    return newUser;
  }

  static async getAllUsers() {
    const users = await prisma.user.findMany();
    return users;
  }

  static async getUserById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user;
  }
}

export default UserModel;
