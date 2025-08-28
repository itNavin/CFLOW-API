export namespace FeedbackPayload {
    export type CreateFeedback = {
        comment: string;
        newDueDate: string;
        newStatus: "REJECTED" | "APPROVED_WITH_FEEDBACK" | "FINAL";
        files: FilePayload[];
    }
}
type FilePayload = {
    deliverableId: number;
    fileUrls: string[];
}