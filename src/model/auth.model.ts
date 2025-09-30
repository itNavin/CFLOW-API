import { prisma } from "../prisma";


class AuthModel {
    static async loginSolarUser(username: string) {
    return prisma.user.findUnique({
      where: { id: username },
    });
  }
}

export { AuthModel };