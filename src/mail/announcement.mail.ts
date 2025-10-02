export const announcementMail = {
  async createAnnouncementMail(courseName: string, created: any) {
    const subject = `New Announcement: ${created.name} in Course ${courseName}`;
    const html = `
      <h1>${created.name}</h1>
      <p>${created.description}</p>
      <p>Scheduled for: ${new Date(created.schedule).toLocaleString()}</p>
    `;
    const text = `${subject}\n\n${
      created.description
    }\n\nScheduled for: ${new Date(created.schedule).toLocaleString()}`;
    return { subject, html, text };
  },
};
