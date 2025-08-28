export namespace SubmissionPayload {
  export type CreateSubmission = {
    comment: string;
    files: FilePayload[];
  };
}

type FilePayload = {
  deliverableId: number;
    fileUrls: string[];
};
