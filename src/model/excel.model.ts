import * as XLSX from "xlsx";
import { prisma } from "../prisma";

type Row = Record<string, any>;

function s(v: any): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}
function sOrNull(v: any): string | null {
  const t = s(v);
  return t === "" ? null : t;
}
function splitFullName(full?: string) {
  const str = (full ?? "").trim();
  if (!str) return { name: "", surname: "" };
  const parts = str.split(/\s+/);
  if (parts.length === 1) return { name: parts[0], surname: "" };
  const surname = parts.pop()!;
  return { name: parts.join(" "), surname };
}

export async function enrollFromWorkbook(courseId: number, fileBuffer: Buffer) {
  // 0) Determine program (CS | DSI)
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { program: true },
  });
  if (!course) throw new Error("Course not found");

  // 1) Read first sheet
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "", raw: false });
  if (rows.length === 0) throw new Error("Excel is empty");

  // 2) Accumulators
  type AccGroup = {
    projectName: string;
    productName: string | null; // CS only; DSI → null
    company: string | null; // DSI only; CS → null
    advisor?: string | null; // identifier string (User.id or email or name)
    coAdvisor?: string | null;
    members: Array<{
      studentId: string;
      name: string;
      surname: string;
      workRole: string | null; // DSI only
    }>;
  };
  const groupsToUpsert = new Map<string, AccGroup>();

  // carry-down support
  let currentGroupCode: string | null = null;
  const carryByGroup = new Map<
    string,
    {
      projectName?: string;
      productName?: string | null;
      company?: string | null;
      advisor?: string | null;
      coAdvisor?: string | null;
    }
  >();

  // 3) Parse rows with carry-down
  rows.forEach((raw, idx) => {
    const excelRow = idx + 2; // header at row 1

    // Read exact headers from your templates (CS / DSI)
    const rawGroup = s(raw["Group No."]);
    const rawProject = s(raw["Project name"]);
    const rawProduct = s(raw["Product name"]); // CS
    const rawCompany = s(raw["Company"]); // DSI
    const rawAdvisor = sOrNull(raw["Advisor"]);
    const rawCoAdv = sOrNull(raw["Co-advisor"]);

    const studentId = s(raw["Student ID"]);
    const fullName = s(raw["Name"]);
    const role = s(raw["Role"]); // DSI

    // Skip totally empty lines
    if (!rawGroup && !studentId && !fullName) return;

    // Carry group code
    if (rawGroup) currentGroupCode = rawGroup;
    const groupCode = currentGroupCode;
    if (!groupCode) {
      throw new Error(`Row ${excelRow}: Missing required fields: Group No.`);
    }

    // Initialize per-group carry
    if (!carryByGroup.has(groupCode)) carryByGroup.set(groupCode, {});
    const carry = carryByGroup.get(groupCode)!;

    // Project name: first row must define; subsequent rows can inherit
    if (rawProject) carry.projectName = rawProject;
    if (!carry.projectName) {
      throw new Error(`Row ${excelRow}: Missing required fields: Project name`);
    }

    // Program-specific carried fields
    if (course.program === "CS") {
      if (rawProduct) carry.productName = rawProduct;
      carry.company = null; // CS never has company
    } else {
      if (rawCompany) carry.company = rawCompany;
      carry.productName = null; // DSI never has product
    }

    // Advisors: take the first non-empty within the group
    if (!carry.advisor && rawAdvisor) carry.advisor = rawAdvisor;
    if (!carry.coAdvisor && rawCoAdv) carry.coAdvisor = rawCoAdv;

    // Validate student row minima
    if (!studentId) {
      throw new Error(`Row ${excelRow}: Missing required fields: Student ID`);
    }

    const { name, surname } = splitFullName(fullName);

    // Create/refresh accumulator for this group
    if (!groupsToUpsert.has(groupCode)) {
      groupsToUpsert.set(groupCode, {
        projectName: carry.projectName!,
        productName: course.program === "CS" ? carry.productName ?? null : null,
        company: course.program === "DSI" ? carry.company ?? null : null,
        advisor: carry.advisor ?? null,
        coAdvisor: carry.coAdvisor ?? null,
        members: [],
      });
    } else {
      const g = groupsToUpsert.get(groupCode)!;
      g.projectName = carry.projectName!;
      g.productName =
        course.program === "CS" ? carry.productName ?? null : null;
      g.company = course.program === "DSI" ? carry.company ?? null : null;
      if (!g.advisor && carry.advisor) g.advisor = carry.advisor;
      if (!g.coAdvisor && carry.coAdvisor) g.coAdvisor = carry.coAdvisor;
    }

    groupsToUpsert.get(groupCode)!.members.push({
      studentId,
      name,
      surname,
      workRole: course.program === "DSI" ? role || null : null,
    });
  });

  if (groupsToUpsert.size === 0) throw new Error("No valid rows were found.");

  // 4) Apply to DB (idempotent, with validations)
  return prisma.$transaction(async (tx) => {
    const results: any[] = [];

    // helper: resolve advisor string → user + ensure is CourseMember
    async function resolveAdvisorOrThrow(
      who: "advisor" | "coAdvisor",
      ident: string,
      groupCode: string
    ): Promise<{ userId: number; courseMemberId: number }> {
      const raw0 = (ident ?? "").trim();
      if (!raw0) throw new Error(`Group ${groupCode}: ${who} is empty`);

      // Accept "id:1" or "user:1" or plain "1"
      const numericMatch =
        raw0.match(/^(?:id|user)?\s*:\s*(\d+)$/i) || raw0.match(/^(\d+)$/);
      if (numericMatch) {
        const id = Number(numericMatch[1] ?? numericMatch[0]);
        const user = await tx.user.findUnique({ where: { id } });
        if (!user)
          throw new Error(
            `Group ${groupCode}: ${who} "${raw0}" not found as a user`
          );
        const cm = await tx.courseMember.findFirst({
          where: { courseId, userId: user.id },
          select: { id: true },
        });
        if (!cm)
          throw new Error(
            `Group ${groupCode}: ${who} "${raw0}" is not a member of this course`
          );
        return { userId: user.id, courseMemberId: cm.id };
      }

      // 2) Email
      if (raw0.includes("@")) {
        const user = await tx.user.findUnique({ where: { email: raw0 } });
        if (!user)
          throw new Error(
            `Group ${groupCode}: ${who} "${raw0}" not found as a user`
          );
        const cm = await tx.courseMember.findFirst({
          where: { courseId, userId: user.id },
          select: { id: true },
        });
        if (!cm)
          throw new Error(
            `Group ${groupCode}: ${who} "${raw0}" is not a member of this course`
          );
        return { userId: user.id, courseMemberId: cm.id };
      }

      // Normalize "Surname, Name" → "Name Surname"
      const raw = raw0.includes(",")
        ? raw0
            .split(",")
            .map((s) => s.trim())
            .reverse()
            .join(" ")
        : raw0;

      const tokens = raw.replace(/\s+/g, " ").trim().split(" ");
      if (tokens.length === 1) {
        // Single token: try name OR surname prefix
        const candidates = await tx.user.findMany({
          where: {
            OR: [
              { name: { startsWith: tokens[0], mode: "insensitive" } },
              { surname: { startsWith: tokens[0], mode: "insensitive" } },
            ],
          },
          select: { id: true, email: true, name: true, surname: true },
        });
        return pickCourseMemberOrThrow(candidates, who, raw0, groupCode);
      }

      // Assume first token(s) = given name(s), last token = surname
      const surname = tokens[tokens.length - 1];
      const given = tokens.slice(0, -1).join(" ");

      // Pass 1: exact (case-insensitive)
      let candidates = await tx.user.findMany({
        where: {
          name: { equals: given, mode: "insensitive" },
          surname: { equals: surname, mode: "insensitive" },
        },
        select: { id: true, email: true, name: true, surname: true },
      });

      // Pass 2: startsWith fallback
      if (candidates.length === 0) {
        candidates = await tx.user.findMany({
          where: {
            name: { startsWith: given, mode: "insensitive" },
            surname: { startsWith: surname, mode: "insensitive" },
          },
          select: { id: true, email: true, name: true, surname: true },
        });
      }

      // Pass 3: swap segments for names like "John Michael Doe"
      if (candidates.length === 0 && tokens.length >= 3) {
        const altGiven = tokens[0];
        const altSurname = tokens.slice(1).join(" ");
        candidates = await tx.user.findMany({
          where: {
            name: { startsWith: altGiven, mode: "insensitive" },
            surname: { startsWith: altSurname, mode: "insensitive" },
          },
          select: { id: true, email: true, name: true, surname: true },
        });
      }

      return pickCourseMemberOrThrow(candidates, who, raw0, groupCode);

      async function pickCourseMemberOrThrow(
        candidates: Array<{
          id: number;
          email: string | null;
          name: string;
          surname: string;
        }>,
        who: "advisor" | "coAdvisor",
        raw: string,
        groupCode: string
      ) {
        if (candidates.length === 0) {
          throw new Error(
            `Group ${groupCode}: ${who} "${raw}" not found as a user`
          );
        }

        const cmRows = await tx.courseMember.findMany({
          where: { courseId, userId: { in: candidates.map((u) => u.id) } },
          select: { id: true, userId: true },
        });

        if (cmRows.length === 0) {
          const list = candidates
            .slice(0, 5)
            .map(
              (u) =>
                `${u.name} ${u.surname} (id:${u.id}${
                  u.email ? `, ${u.email}` : ""
                })`
            )
            .join("; ");
          throw new Error(
            `Group ${groupCode}: ${who} "${raw}" matches user(s) not in this course: ${list}`
          );
        }

        if (cmRows.length > 1) {
          const byId = new Map(candidates.map((u) => [u.id, u]));
          const list = cmRows
            .slice(0, 5)
            .map((cm) => {
              const u = byId.get(cm.userId)!;
              return `${u.name} ${u.surname} (id:${u.id}${
                u.email ? `, ${u.email}` : ""
              })`;
            })
            .join("; ");
          throw new Error(
            `Group ${groupCode}: ${who} "${raw}" is ambiguous among course members: ${list}`
          );
        }

        const only = cmRows[0];
        return { userId: only.userId, courseMemberId: only.id };
      }
    }

    for (const [groupCode, payload] of groupsToUpsert) {
      // (A) Validate duplicate projectName within course (different code)
      const nameConflict = await tx.group.findFirst({
        where: {
          courseId,
          projectName: payload.projectName,
          NOT: { codeNumber: groupCode }, // exclude the same group by code
        },
        select: { id: true, codeNumber: true },
      });
      if (nameConflict) {
        throw new Error(
          `Group "${payload.projectName}" already exists in this course as code ${nameConflict.codeNumber}`
        );
      }

      // (B) Upsert group by unique (courseId, codeNumber)
      const group = await tx.group.upsert({
        where: { courseId_codeNumber: { courseId, codeNumber: groupCode } },
        update: {
          projectName: payload.projectName,
          productName:
            course.program === "CS" ? payload.productName ?? undefined : null,
          company:
            course.program === "DSI" ? payload.company ?? undefined : null,
        },
        create: {
          courseId,
          codeNumber: groupCode,
          projectName: payload.projectName,
          productName:
            course.program === "CS" ? payload.productName ?? undefined : null,
          company:
            course.program === "DSI" ? payload.company ?? undefined : null,
        },
        select: { id: true, projectName: true, codeNumber: true },
      });

      // (C) Resolve & link advisors (idempotent)
      const advisorRefs: Array<{
        courseMemberId: number;
        groupId: number;
        advisorRole: "ADVISOR" | "CO_ADVISOR";
      }> = [];

      if (payload.advisor) {
        const a = await resolveAdvisorOrThrow(
          "advisor",
          payload.advisor,
          groupCode
        );
        advisorRefs.push({
          courseMemberId: a.courseMemberId,
          groupId: group.id,
          advisorRole: "ADVISOR",
        });
      }
      if (payload.coAdvisor) {
        const ca = await resolveAdvisorOrThrow(
          "coAdvisor",
          payload.coAdvisor,
          groupCode
        );
        advisorRefs.push({
          courseMemberId: ca.courseMemberId,
          groupId: group.id,
          advisorRole: "CO_ADVISOR",
        });
      }

      if (advisorRefs.length) {
        await tx.groupAdvisor.createMany({
          data: advisorRefs,
          skipDuplicates: true,
        });
      }

      // (D) Resolve students (Student ID → User.id)
      const resolvedMembers = await Promise.all(
        payload.members.map(async (m) => {
          const numericId = Number(m.studentId);
          const user = Number.isFinite(numericId)
            ? await tx.user.findUnique({ where: { id: numericId } })
            : null;
          if (!user) {
            throw new Error(
              `Group ${groupCode}: User not found for Student ID "${m.studentId}"`
            );
          }
          return {
            userId: user.id,
            studentId: m.studentId,
            workRole: m.workRole ?? "STUDENT",
          };
        })
      );

      // (E) Ensure CourseMember rows (no duplicates)
      if (resolvedMembers.length) {
        await tx.courseMember.createMany({
          data: resolvedMembers.map(({ userId }) => ({ courseId, userId })),
          skipDuplicates: true, // requires @@unique([courseId,userId])
        });
      }

      // Map CourseMember ids for these users
      const cmRows = await tx.courseMember.findMany({
        where: {
          courseId,
          userId: { in: resolvedMembers.map((r) => r.userId) },
        },
        select: { id: true, userId: true },
      });
      const cmByUser = new Map(cmRows.map((r) => [r.userId, r.id]));

      // (F) Check if any of these students already belong to ANY group in this course
      const cmIds = cmRows.map((r) => r.id);
      const memberships = await tx.groupMember.findMany({
        where: { courseMemberId: { in: cmIds } },
        include: {
          group: {
            select: {
              id: true,
              courseId: true,
              codeNumber: true,
              projectName: true,
            },
          },
        },
      });

      // Build lookup by courseMemberId
      const membershipByCmId = new Map<
        number,
        {
          groupId: number;
          codeNumber: string | null;
          projectName: string | null;
        }
      >();
      for (const m of memberships) {
        if (m.group.courseId === courseId) {
          membershipByCmId.set(m.courseMemberId, {
            groupId: m.group.id,
            codeNumber: m.group.codeNumber ?? null,
            projectName: m.group.projectName ?? null,
          });
        }
      }

      // If any already in some group in this course (including same group), error
      for (const m of resolvedMembers) {
        const cmId = cmByUser.get(m.userId)!;
        const existing = membershipByCmId.get(cmId);
        if (existing) {
          const code = existing.codeNumber ?? "(no code)";
          const proj = existing.projectName ?? "(no name)";
          throw new Error(
            `Group ${groupCode}: student ${m.studentId} is already assigned to group ${code} (${proj}) in this course`
          );
        }
      }

      // (G) Create GroupMember rows (only if no conflicts)
      const existingGm = await tx.groupMember.findMany({
        where: { groupId: group.id },
        select: { courseMemberId: true },
      });
      const existingSet = new Set(existingGm.map((g) => g.courseMemberId));

      const gmToCreate = resolvedMembers
        .map(({ userId, workRole }) => {
          const cmId = cmByUser.get(userId);
          if (!cmId || existingSet.has(cmId)) return null;
          return { courseMemberId: cmId, groupId: group.id, workRole };
        })
        .filter(Boolean) as Array<{
        courseMemberId: number;
        groupId: number;
        workRole: string;
      }>;

      if (gmToCreate.length) {
        await tx.groupMember.createMany({
          data: gmToCreate,
          skipDuplicates: true,
        });
      }

      results.push({
        groupCode,
        groupId: group.id,
        membersProcessed: resolvedMembers.length,
        groupMembersInserted: gmToCreate.length,
        advisor: payload.advisor ?? null,
        coAdvisor: payload.coAdvisor ?? null,
        advisorsLinked: advisorRefs.length,
      });
    }

    return {
      courseId,
      program: course.program,
      groupsProcessed: results.length,
      details: results,
    };
  });
}
