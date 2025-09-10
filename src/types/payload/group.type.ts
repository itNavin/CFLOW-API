export namespace GroupPayload {
  export type createGroup = {
    courseId: string;
    projectName: string;
    codeNumber?: string;
    productName?: string;
    company?: string;
    memberIds: MemberPayload[];
    advisorIds?: AdvisorId[];
    coAdvisorIds?: CoAdvisorId[];
  };
  export type updateGroup = {
    courseId: string;
    groupId: string;
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
  id: string;
  workRole: string;
};

type AdvisorId = {
  id: string;
};

type CoAdvisorId = {
  id: string;
};
