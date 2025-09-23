import { prisma } from "../prisma";

type UploadRow = {
  rowNumber: number;
  id: string; 
  email: string; 
  name: string; 
};

type UploadArgs = {
  rows: UploadRow[];
  role: "student" | "lecturer" | "staff" | "SUPER_ADMIN";
  program: "CS" | "DSI" | "BOTH"; 
};

class UserModel {

  static async getStudentProjectByCourse(userId: string, courseId: string) {
    const cm = await prisma.courseMember.findFirst({
      where: { courseId, userId },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            role: true,
            name: true,
            email: true,
          },
        },
        course: { select: { id: true, name: true, program: true } },
        groupMembers: {
          include: {
            group: {
              select: {
                id: true,
                codeNumber: true,
                projectName: true,
                productName: true,
                company: true,
              },
            },
          },
        },
      },
    });

    if (!cm) {
      const err: any = new Error("Not enrolled in this course");
      err.status = 404;
      throw err;
    }

    if (cm.user.role !== "student") {
      const err: any = new Error("Only student can have a personal project");
      err.status = 403;
      throw err;
    }

    const groups = cm.groupMembers.map((gm) => gm.group);

    if (groups.length === 0) {
      const err: any = new Error("You are not assigned to any group yet");
      err.status = 404;
      throw err;
    }
    if (groups.length > 1) {
      const err: any = new Error(
        `You are assigned to multiple groups in this course: ${groups
          .map((g) => `#${g.codeNumber ?? g.id} (${g.projectName})`)
          .join(", ")}`
      );
      err.status = 409;
      throw err;
    }

    const g = groups[0];

    return {
      
      group: {
        id: g.id,
        codeNumber: g.codeNumber,
        projectName: g.projectName,
        productName: g.productName, // CS only
        company: g.company, // DSI only
      },
    };
  }

  static async uploadStudentDataByExcel({ rows, role, program }: UploadArgs) {
    const errors: Array<{ row: number; id: string; reason: string }> = [];
    let created = 0;
    let updated = 0;

    await prisma.$transaction(
      async (tx) => {
        for (const r of rows) {
          try {
            const res = await tx.user.upsert({
              where: { id: r.id },
              create: {
                id: r.id,
                email: r.email,
                name: r.name,
                role,     
                program, 
              },
              update: {
                email: r.email,
                name: r.name,
                role,
                program,
              },
              select: { id: true }, 
            });
          } catch (e: any) {
            errors.push({
              row: r.rowNumber,
              id: r.id,
              reason: e?.message ?? "Unknown error",
            });
          }
        }
      },
      { timeout: 120_000 }
    );

    const ids = rows.map((r) => r.id);
    const existing = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((u) => u.id));
    created = rows.filter((r) => !existingSet.has(r.id)).length;
    updated = rows.length - created - errors.length;
    if (updated < 0) updated = 0;
    return {
      summary: {
        totalRows: rows.length,
        created,
        updated,
        failed: errors.length,
      },
      errors,
    };
  }
}

export default UserModel;
