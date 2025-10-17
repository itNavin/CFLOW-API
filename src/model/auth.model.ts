import { prisma } from "../prisma";


class AuthModel {
    static async loginSolarUser(username: string) {
    return prisma.user.findUnique({
      where: { id: username },
    });
  }
  static async getUserStatusById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
  }
}

export { AuthModel };