export namespace AnnouncementPayload {
  export type CreateAnnouncement = {
    courseId: string;
    name: string;
    description: string;
    schedule: string;

  };
  export type UpdateAnnouncement = {
    announcementId: string;
    name: string;
    description: string;
    schedule: string;
  };
}

  
