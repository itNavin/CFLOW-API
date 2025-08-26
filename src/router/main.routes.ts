import { Hono } from "hono";
// import { exampleRouter } from "./example.routes";
import { courseRouter } from "./course.routes"; // 👈 import the course router
import { userRouter } from "./user.routes"; // Import the user router
import { courseMemberRouter } from "./courseMember.routes";
import { groupRouter } from "./group.routes";
import { dashboardRouter } from "./dashboard.routes";
import { announcementRouter } from "./announcement.routes";
import { fileRouter } from "./file.routes";
import { loginRouter } from "./login.routes";
import { authMiddleware } from "src/middleware/auth";
import { assignmentRouter} from "./assignment.routes"
import { submissionRouter } from "./submission.routes";
import { feedbackRouter } from "./feedback.routes";
import { filenameRouter } from "./filename.routes";
import { main } from "bun";

const mainRouter = new Hono();

mainRouter.route("/login", loginRouter); // Mount the /login route

mainRouter.use(authMiddleware);
mainRouter.route("/course", courseRouter); //  mount the /course route
mainRouter.route("/user", userRouter); // Mount the /user route
mainRouter.route("/courseMember", courseMemberRouter); // Mount the /courseMember route
mainRouter.route("/group", groupRouter); // Mount the /group route
mainRouter.route("/dashboard", dashboardRouter); // Mount the /dashboard route
mainRouter.route("/announcement", announcementRouter); // Mount the /announcement route
mainRouter.route("/file", fileRouter); // Mount the /file route
mainRouter.route("/assignment", assignmentRouter)
mainRouter.route("/submission", submissionRouter); // Mount the /submission route
mainRouter.route("/feedback", feedbackRouter); // Mount the /feedback route
mainRouter.route("/filename", filenameRouter); // Mount the /filename route


export { mainRouter };
