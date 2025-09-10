export namespace CourseMemberPayload {
    export type AddMember = {
        courseId : string;
        userIds : string[];
    }

    export type BulkDeleteCMResult = {
      requestedIds: string[];
      deletedIds: string[];
      notFoundIds: string[];
      blocked: Array<{
        courseMemberId: string;
        userId: string;
        userName: string;
        reasons: {
          groupMembers: number;
          groupAdvisors: number;
        };
      }>;
    };

    export type deleteMember = {
        courseMemberIds: string[];
    }
}