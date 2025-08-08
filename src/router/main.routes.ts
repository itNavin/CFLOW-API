import { Hono } from "hono";
import { exampleRouter } from "./example.routes";
import { courseRouter } from "./course.routes"; // 👈 import the course router
import { userRouter } from "./user.routes"; // Import the user router
import { courseMemberRouter } from "./courseMember.routes";
import { groupRouter } from "./group.routes";

const mainRouter = new Hono();

mainRouter.route("/example", exampleRouter);
mainRouter.route("/course", courseRouter); // 👈 mount the /course route
mainRouter.route("/user", userRouter); // Mount the /user route
mainRouter.route("/courseMember", courseMemberRouter); // Mount the /courseMember route
mainRouter.route("/group", groupRouter); // Mount the /group route


export { mainRouter };
