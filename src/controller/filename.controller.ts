// import type { Context } from "hono";
// import FilenameModel from "../model/filename.model";
// import { FilenamePayload } from "../types/payload/filename.type";
// import { mailRoles } from "src/util/mailRole";
// import { mailSentAndSummary } from "src/util/mailSummary";

// export const FilenameController = {
//   changeFileName: async (c: Context) => {
//     try {
//       const body = await c.req.json<FilenamePayload.FilePayload>();

//       const groupCode = body.groupCode.trim();
//       const deliverableName = body.deliverableName.trim();
//       const version = body.version;
//       const originalName = body.originalName;
//       const mime = body.mime;
//       const partIndex = body.partIndex;
//       const deliverableId = body.deliverableId;
//       const courseId = body.courseId;
//       const assignmentId = body.assignmentId;

//       if (!groupCode) return c.json({ message: "groupCode is required" }, 400);
//       if (!deliverableName)
//         return c.json({ message: "deliverableName is required" }, 400);
//       if (!Number.isFinite(version) || version <= 0) {
//         return c.json({ message: "version must be a positive number" }, 400);
//       }
//       if (partIndex != null && (!Number.isFinite(partIndex) || partIndex < 1)) {
//         return c.json(
//           { message: "partIndex must be a positive integer if provided" },
//           400
//         );
//       }

//       const result = await FilenameModel.changeFileName({
//         groupCode,
//         deliverableName,
//         version,
//         originalName,
//         mime,
//         partIndex,
//         deliverableId, 
//         courseId,
//         assignmentId,
//       });

//       return c.json(result, 200);
//     } catch (err: any) {
//       console.error("changeFileName error:", err);
//       return c.json(
//         { message: err?.message ?? "Failed to generate filename" },
//         400
//       );
//     }
//   },
// };

