import { prisma } from "..";

class GroupModel {
  static async createGroup(data: {
    courseId: number;
    projectName: string;
    productName?: string | null;
    company?: string | null;
    memberIds?: { id: number; workRole: string }[];
    advisorIds?: number[];
    coAdvisorIds?: number[];
  }) {
    return await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          projectName: data.projectName,
          productName: data.productName ?? undefined,
          company: data.company ?? undefined,
          course: {
            connect: { id: data.courseId },
          },
        },
      });

      if (data.memberIds?.length) {
        await tx.groupMember.createMany({
          data: data.memberIds.map(({ id, workRole }) => ({
            courseMemberId: id,
            groupId: newGroup.id,
            workRole,
          })),
        });
      }

      if (data.advisorIds?.length) {
        await tx.groupAdvisor.createMany({
          data: data.advisorIds.map((courseMemberId) => ({
            courseMemberId,
            groupId: newGroup.id,
            advisorRole: "ADVISOR",
          })),
        });
      }

      if (data.coAdvisorIds?.length) {
        await tx.groupAdvisor.createMany({
          data: data.coAdvisorIds.map((courseMemberId) => ({
            courseMemberId,
            groupId: newGroup.id,
            advisorRole: "CO_ADVISOR",
          })),
        });
      }

      return newGroup;
    });
  }

  static getAllGroups = async (courseId: number) => {
    return await prisma.group.findMany({
      where: { courseId },
      include: {
        members: true,
        advisors: true,
        dueDateUpdates: true,
        submissions: true,
        course: true,
      },
    });
  };
}

export default GroupModel;
