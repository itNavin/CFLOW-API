export namespace GroupPayload {
  export type Group = {
    projectName: string;
    codeNumber?: string;
    productName?: string;
    company?: string;
    memberIds: MemberPayload[];
    advisorIds?: AdvisorId[];
    coAdvisorIds?: CoAdvisorId[];
  };
}

type MemberPayload = {
  id: number;
  workRole: string;
};

type AdvisorId = {
  id: number;
};

type CoAdvisorId = {
  id: number;
};
