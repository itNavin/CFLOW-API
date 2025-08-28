export namespace AssignmentPayload {
  export type CreateAssignment = {
    name: string;
    description: string;
    endDate: string;
    schedule: string;
    dueDate: string;
    deliverables: DeliverablePayload[];
  };
}

type DeliverablePayload = {
  name: string;
  allowedFileTypes: string[]; // e.g. ["pdf", "docx"]
};
