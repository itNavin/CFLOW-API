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

export async function enrollFromWorkbook(courseId: string, fileBuffer: Buffer) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { program: true },
  });
  if (!course) throw new Error("Course not found");

  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: "", raw: false });
  if (rows.length === 0) throw new Error("Excel is empty");

  type AccGroup = {
    projectName: string;
    productName: string | null;
    company: string | null;
    advisor?: string | null;
    coAdvisor?: string | null;
    members: Array<{
      studentId: string;
      name: string;
      workRole: string | null;
    }>;
  };
  const groupsToUpsert = new Map<string, AccGroup>();

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

  rows.forEach((raw, idx) => {
    const excelRow = idx + 2;

    const rawGroup = s(raw["Group No."]);
    const rawProject = s(raw["Project name"]);
    const rawProduct = s(raw["Product name"]);
    const rawCompany = s(raw["Company"]);
    const rawAdvisor = sOrNull(raw["Advisor"]);
    const rawCoAdv = sOrNull(raw["Co-advisor"]);

    const studentId = s(raw["Student ID"]);
    const fullName = s(raw["Name"]);
    const role = s(raw["Role"]);

    if (!rawGroup && !studentId && !fullName) return;

    if (rawGroup) currentGroupCode = rawGroup;
    const groupCode = currentGroupCode;
    if (!groupCode) {
      throw new Error(`Row ${excelRow}: Missing required fields: Group No.`);
    }

    if (!carryByGroup.has(groupCode)) carryByGroup.set(groupCode, {});
    const carry = carryByGroup.get(groupCode)!;

    if (rawProject) carry.projectName = rawProject;
    if (!carry.projectName) {
      throw new Error(`Row ${excelRow}: Missing required fields: Project name`);
    }

    if (course.program === "CS") {
      if (rawProduct) carry.productName = rawProduct;
      carry.company = null;
    } else {
      if (rawCompany) carry.company = rawCompany;
      carry.productName = null;
    }

    if (!carry.advisor && rawAdvisor) carry.advisor = rawAdvisor;
    if (!carry.coAdvisor && rawCoAdv) carry.coAdvisor = rawCoAdv;

    if (!studentId) {
      throw new Error(`Row ${excelRow}: Missing required fields: Student ID`);
    }

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
      name: fullName,
      workRole: course.program === "DSI" ? role || null : null,
    });
  });

  if (groupsToUpsert.size === 0) throw new Error("No valid rows were found.");

  return prisma.$transaction(async (tx) => {
    const results: any[] = [];

    async function resolveAdvisorOrThrow(
      who: "advisor" | "coAdvisor",
      ident: string,
      groupCode: string
    ): Promise<{ userId: string; courseMemberId: string }> {
      const raw0 = (ident ?? "").trim();
      if (!raw0) throw new Error(`Group ${groupCode}: ${who} is empty`);

      const explicitIdMatch = raw0.match(/^(?:id|user)\s*:\s*(\S+)$/i);
      const looksLikeUuid =
        /^[0-9a-fA-F-]{16,}$/.test(raw0) || /^[a-f0-9]{24}$/i.test(raw0);
      const looksLikeDigits = /^\d+$/.test(raw0);

      if (explicitIdMatch || looksLikeUuid || looksLikeDigits) {
        const id = explicitIdMatch ? explicitIdMatch[1] : raw0;
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

      const raw = raw0.includes(",")
        ? raw0
            .split(",")
            .map((s) => s.trim())
            .reverse()
            .join(" ")
        : raw0;

      const tokens = raw.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);

      let candidates = await tx.user.findMany({
        where: {
          OR: [
            { name: { equals: raw, mode: "insensitive" } },
            { name: { startsWith: raw, mode: "insensitive" } },
            { name: { contains: raw, mode: "insensitive" } },
          ],
        },
        select: { id: true, email: true, name: true },
      });

      if (candidates.length === 0 && tokens.length >= 2) {
        candidates = await tx.user.findMany({
          where: {
            AND: tokens.map((t) => ({
              name: { contains: t, mode: "insensitive" },
            })),
          },
          select: { id: true, email: true, name: true },
        });
      }

      return pickCourseMemberOrThrow(candidates, who, raw0, groupCode);

      async function pickCourseMemberOrThrow(
        candidates: Array<{
          id: string;
          email: string | null;
          name: string;
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
              (u) => `${u.name} (id:${u.id}${u.email ? `, ${u.email}` : ""})`
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
              return `${u.name} (id:${u.id}${u.email ? `, ${u.email}` : ""})`;
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
      const nameConflict = await tx.group.findFirst({
        where: {
          courseId,
          projectName: payload.projectName,
          NOT: { codeNumber: groupCode },
        },
        select: { id: true, codeNumber: true },
      });
      if (nameConflict) {
        throw new Error(
          `Group "${payload.projectName}" already exists in this course as code ${nameConflict.codeNumber}`
        );
      }

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

      const advisorRefs: Array<{
        courseMemberId: string;
        groupId: string;
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

      const resolvedMembers = await Promise.all(
        payload.members.map(async (m) => {
          const user = await tx.user.findUnique({ where: { id: m.studentId } });
          if (!user) {
            throw new Error(
              `Group ${groupCode}: User not found for Student ID "${m.studentId}"`
            );
          }
          return {
            userId: user.id as string,
            studentId: m.studentId,
            workRole: m.workRole ?? "STUDENT",
          };
        })
      );

      if (resolvedMembers.length) {
        await tx.courseMember.createMany({
          data: resolvedMembers.map(({ userId }) => ({ courseId, userId })),
          skipDuplicates: true,
        });
      }

      const cmRows = await tx.courseMember.findMany({
        where: {
          courseId,
          userId: { in: resolvedMembers.map((r) => r.userId) },
        },
        select: { id: true, userId: true },
      });
      const cmByUser = new Map<string, string>(
        cmRows.map((r) => [r.userId, r.id])
      );

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

      const membershipByCmId = new Map<
        string,
        {
          groupId: string;
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
        courseMemberId: string;
        groupId: string;
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
