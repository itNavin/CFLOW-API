import { Hono } from "hono";
import { courseRouter } from "./course.routes"; 
import { userRouter } from "./user.routes"; 
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
import { importRouter } from "./excel.routes";
import { storageRouter } from "./storage.routes";

const mainRouter = new Hono();

mainRouter.route("/login", loginRouter); 

mainRouter.use(authMiddleware);
mainRouter.route("/course", courseRouter); 
mainRouter.route("/user", userRouter); 
mainRouter.route("/courseMember", courseMemberRouter); 
mainRouter.route("/group", groupRouter); 
mainRouter.route("/dashboard", dashboardRouter); 
mainRouter.route("/announcement", announcementRouter); 
mainRouter.route("/file", fileRouter); 
mainRouter.route("/assignment", assignmentRouter)
mainRouter.route("/submission", submissionRouter); 
mainRouter.route("/feedback", feedbackRouter); 
mainRouter.route("/filename", filenameRouter); 
mainRouter.route("/import", importRouter);
mainRouter.route("/storage", storageRouter);

export { mainRouter };
