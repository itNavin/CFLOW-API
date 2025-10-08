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

export type ApiStudentRow = {
  studentId?: string | number;
  firstnameEng?: string;
  lastnameEng?: string;
  lastnameEnd?: string;
  programNameEng?: string;
  statusName?: string; 
};

type CleanRow = {
  id: string;
  email: string;
  name: string;
  role: "student";
  program: "CS" | "DSI";
};

function mapProgram(p?: string): "CS" | "DSI" | null {
  const s = (p ?? "").trim();
  if (!s) return null;

  if (s === "Bachelor of Science Program in Computer Science (English Program)") {
    return "CS";
  }
  if (s === "Bachelor of Arts Programme in Digital Service Innovation") {
    return "DSI";
  }

  return null;
}


function normalizeAndDedupe(rows: ApiStudentRow[]): CleanRow[] {
  const out: CleanRow[] = [];

  for (const r of rows) {
    const id = String(r.studentId ?? "").trim();
    if (!id) continue;

    if ((r.statusName ?? "").trim() !== "กำลังศึกษาอยู่") continue;

    const program = mapProgram(r.programNameEng);
    if (!program) continue; 

    const first = (r.firstnameEng ?? "").trim();
    const last = (r.lastnameEng ?? r.lastnameEnd ?? "").trim();
    const name = [first, last].filter(Boolean).join(" ").trim() || id;

    out.push({
      id,
      email: `${id}@st.sit.kmutt.ac.th`,
      name,
      role: "student",
      program,
    });
  }

  const m = new Map<string, CleanRow>();
  for (const row of out) if (!m.has(row.id)) m.set(row.id, row);
  return [...m.values()];
}


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
      return {
        group: {
          id: "None",
          codeNumber: "None",
          projectName: "None",
          productName: "None",
          company: "None",
        },
      };
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
        productName: g.productName, 
        company: g.company, 
      },
    };
  }

  static async createStaffUser(id: string, email: string, name: string, program: "CS" | "DSI" | "BOTH") {
    return prisma.user.create({
      data: {
        id,
        email,
        name,
        role: "staff",
        program,
      },
    });
  }

  static async createLecturerUser(
    id: string,
    email: string,
    name: string,
    program: "CS" | "DSI" | "BOTH"
  ) {
    return prisma.user.create({
      data: {
        id,
        email,
        name,
        role: "lecturer",
        program,
      },
    });
  }

  static async createSolarLecturerUser(
    id: string,
    email: string,
    name: string,
    password: string,
    program: "CS" | "DSI" | "BOTH"
  ) {
    return prisma.user.create({
      data: {
        id,
        email,
        name,
        password,
        role: "lecturer",
        program,
      },
    });
  }

  static async updateSolarPassword(id: string, newPassword: string) {
    return prisma.user.update({
      where: { id },
      data: { password: newPassword },
    });
  }

  static async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        program: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
  }

  static async fetchStudentDataFromAPI(rows: ApiStudentRow[]) {
    const clean = normalizeAndDedupe(rows);

    if (clean.length === 0) {
      return { totalFromAPI: rows.length, prepared: 0, created: 0, skipped: 0, errors: [] as any[] };
    }

    // If your dataset can be very large, use chunked createMany to keep each call < ~1s.
    const CHUNK = 1000; // tune 500–2000 based on DB/infra
    let created = 0;

    for (let i = 0; i < clean.length; i += CHUNK) {
      const slice = clean.slice(i, i + CHUNK);
      const res = await prisma.user.createMany({
        data: slice,
        skipDuplicates: true, 
      });
      created += res.count;
    }

    const prepared = clean.length;
    const skipped = prepared - created;

    return {
      totalFromAPI: rows.length, 
      prepared,                 
      created,                 
      skipped,                  
    };
  }
}

export default UserModel;
