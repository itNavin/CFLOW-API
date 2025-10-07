import { prisma } from "src/prisma";

class ActivityModel {
    static async getActivitiesByUserId(userId: string) {
        return prisma.activityLog.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}

export default ActivityModel;