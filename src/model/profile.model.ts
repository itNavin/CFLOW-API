import { prisma } from "../prisma";

class ProfileModel {
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        program: true,
        classMemberships: {
          select: {
            course: {
              select: {
                id: true,
                name: true,
                description: true,
                program: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const courses = user.classMemberships.map((m) => m.course);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        program: user.program,
      },
      courseNames: courses.map((c) => c.name),
    };
  }
}

export default ProfileModel;
