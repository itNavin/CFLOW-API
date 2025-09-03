export namespace AnnouncementPayload {
  export type CreateAnnouncement = {
    name: string;
    description: string;
    schedule: string;
    // createById: number;
    // files?: FilePayload[];
  };
}

// type FilePayload = {
//   name: string;
//   filepath: string;
//   uploadById: number;
// };