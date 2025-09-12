export namespace FeedbackPayload {
    export type CreateFeedback = {
        submissionId: string;
        comment: string;
        newDueDate: string | null;
        newStatus: "REJECTED" | "APPROVED_WITH_FEEDBACK" | "FINAL";
        files: FilePayload[];
    }
}
type FilePayload = {
    deliverableId: number;
    fileUrls: string[];
}