export namespace AssignmentPayload {
  export type CreateAssignment = {
    courseId: string;
    name: string;
    description: string;
    endDate: string;
    schedule: string;
    dueDate: string;
    deliverables: DeliverablePayload[];
  };

  export type getAdvisorGroups = {
    courseId: string;
  };
}

type DeliverablePayload = {
  name: string;
  allowedFileTypes: string[]; // e.g. ["pdf", "docx"]
};
