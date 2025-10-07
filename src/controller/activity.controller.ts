import { Context } from "hono";
import ActivityModel from "../model/activity.model";

export const ActivityController = {
    getActivitiesByUserId: async (c: Context) => {
        try {
            const userId = c.get("userId");
            if (!userId) {
                return c.json({ message: "Unauthorized" }, 401);
            }
            const activities = await ActivityModel.getActivitiesByUserId(userId);

            return c.json(
                {
                    message: "Activities fetched successfully",
                    activities: activities,
                },
                200
            );
        } catch (error) {
          console.error({
            context: "getActivitiesByUserId",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          return c.json(
            { message: "Internal server error. Please try again later." },
            500
          );
        }
    }
}