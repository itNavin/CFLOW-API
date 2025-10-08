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
    groupCode: string;
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
    excelRow: number;
  };

  const groupsToInsert = new Map<string, AccGroup>();
  const seen = {
    groupCodes: new Map<string, number>(),
    projectNames: new Map<string, number>(),
    productNames: new Map<string, number>(),
    studentIds: new Map<string, number>(),
    studentNames: new Map<string, number>(),
  };

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

  let currentGroupCode: string | null = null;

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

    if (!rawGroup && !rawProject && !studentId && !fullName) return;

    if (rawGroup) currentGroupCode = rawGroup;
    const groupCode = currentGroupCode;
    if (!groupCode) {
      throw new Error(`Row ${excelRow}: Missing required field "Group No."`);
    }

    if (!carryByGroup.has(groupCode)) carryByGroup.set(groupCode, {});
    const carry = carryByGroup.get(groupCode)!;

    if (rawProject) carry.projectName = rawProject;
    if (course.program === "CS" && rawProduct) carry.productName = rawProduct;
    if (course.program === "DSI" && rawCompany) carry.company = rawCompany;
    if (rawAdvisor) carry.advisor = rawAdvisor;
    if (rawCoAdv) carry.coAdvisor = rawCoAdv;

    if (!carry.projectName) {
      throw new Error(`Row ${excelRow}: Missing required field "Project name"`);
    }
    if (course.program === "CS" && !carry.productName) {
      throw new Error(`Row ${excelRow}: Missing required field "Product name"`);
    }
    if (course.program === "DSI" && !carry.company) {
      throw new Error(`Row ${excelRow}: Missing required field "Company"`);
    }

    function checkDup(map: Map<string, number>, key: string, label: string) {
      if (!key) return;
      if (map.has(key)) {
        const prevRow = map.get(key)!;
        throw new Error(
          `Duplicate ${label} "${key}" found in rows ${prevRow} and ${excelRow}`
        );
      }
      map.set(key, excelRow);
    }

    if (!groupsToInsert.has(groupCode)) {
      checkDup(seen.groupCodes, groupCode, "Group No.");
      checkDup(seen.projectNames, carry.projectName!, "Project name");
      if (course.program === "CS" && carry.productName) {
        checkDup(seen.productNames, carry.productName, "Product name");
      }

      groupsToInsert.set(groupCode, {
        groupCode,
        projectName: carry.projectName!,
        productName: course.program === "CS" ? carry.productName ?? null : null,
        company: course.program === "DSI" ? carry.company ?? null : null,
        advisor: carry.advisor ?? null,
        coAdvisor: carry.coAdvisor ?? null,
        members: [],
        excelRow,
      });
    }

    if (studentId || fullName) {
      if (studentId) checkDup(seen.studentIds, studentId, "Student ID");
      if (fullName) checkDup(seen.studentNames, fullName, "Student Name");

      groupsToInsert.get(groupCode)!.members.push({
        studentId,
        name: fullName,
        workRole: course.program === "DSI" ? role || null : null,
      });
    }
  });

  if (groupsToInsert.size === 0)
    throw new Error("No valid groups found in Excel.");

  return prisma.$transaction(async (tx) => {
    const results: any[] = [];

    for (const [groupCode, payload] of groupsToInsert) {
      if (payload.members.length > 3) {
        throw new Error(
          `Group "${groupCode}" has more than 3 students (found ${payload.members.length})`
        );
      }

      const existingByCode = await tx.group.findUnique({
        where: { courseId_codeNumber: { courseId, codeNumber: groupCode } },
      });
      if (existingByCode) {
        throw new Error(
          `Group code "${groupCode}" already exists in this course (row ${payload.excelRow})`
        );
      }

      const existingByName = await tx.group.findFirst({
        where: { courseId, projectName: payload.projectName },
      });
      if (existingByName) {
        throw new Error(
          `Project name "${payload.projectName}" already exists in this course (row ${payload.excelRow})`
        );
      }

      if (course.program === "CS" && payload.productName) {
        const existingByProduct = await tx.group.findFirst({
          where: { courseId, productName: payload.productName },
        });
        if (existingByProduct) {
          throw new Error(
            `Product name "${payload.productName}" already exists in this course (row ${payload.excelRow})`
          );
        }
      }

      const group = await tx.group.create({
        data: {
          courseId,
          codeNumber: groupCode,
          projectName: payload.projectName,
          productName: payload.productName,
          company: payload.company,
        },
        select: { id: true, codeNumber: true, projectName: true },
      });

      const advisorRefs: {
        courseMemberId: string;
        groupId: string;
        advisorRole: "ADVISOR" | "CO_ADVISOR";
      }[] = [];

      let advisorUserId: string | null = null;
      let coAdvisorUserId: string | null = null;

      async function handleAdvisor(
        name: string,
        role: "ADVISOR" | "CO_ADVISOR"
      ): Promise<string> {
        const user = await tx.user.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        });
        if (!user) {
          throw new Error(
            `Group "${groupCode}": ${role} "${name}" not found in database`
          );
        }

        const cm = await tx.courseMember.upsert({
          where: { courseId_userId: { courseId, userId: user.id } },
          create: { courseId, userId: user.id },
          update: {},
        });

        advisorRefs.push({
          courseMemberId: cm.id,
          groupId: group.id,
          advisorRole: role,
        });

        return user.id;
      }

      if (payload.advisor) {
        advisorUserId = await handleAdvisor(payload.advisor, "ADVISOR");
      }
      if (payload.coAdvisor) {
        coAdvisorUserId = await handleAdvisor(payload.coAdvisor, "CO_ADVISOR");
      }

      if (
        advisorUserId &&
        coAdvisorUserId &&
        advisorUserId === coAdvisorUserId
      ) {
        throw new Error(
          `Group "${groupCode}": Advisor and Co-Advisor cannot be the same person`
        );
      }

      if (advisorRefs.length) {
        await tx.groupAdvisor.createMany({
          data: advisorRefs,
          skipDuplicates: true,
        });
      }

      for (const m of payload.members) {
        if (!m.studentId || !m.name) {
          throw new Error(
            `Row ${payload.excelRow}: Student must have both ID and Name if provided`
          );
        }

        const user = await tx.user.findUnique({ where: { id: m.studentId } });
        if (!user) {
          throw new Error(
            `Row ${payload.excelRow}: Student ID "${m.studentId}" not found as user`
          );
        }

        const cm = await tx.courseMember.upsert({
          where: { courseId_userId: { courseId, userId: user.id } },
          create: { courseId, userId: user.id },
          update: {},
        });

        const already = await tx.groupMember.findFirst({
          where: { courseMemberId: cm.id, groupId: group.id },
        });
        if (!already) {
          await tx.groupMember.create({
            data: {
              courseMemberId: cm.id,
              groupId: group.id,
              workRole: m.workRole ?? "STUDENT",
            },
          });
        }
      }

      results.push({
        groupCode,
        groupId: group.id,
        membersProcessed: payload.members.length,
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
