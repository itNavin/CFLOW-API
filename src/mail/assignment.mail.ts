export const assignmentMail = {
    async createAssignmentMail(courseName: string, created: any) {
        const subject = `New Assignment: ${created.name} in Course ${courseName}`;
        const html = `
      <h1>${created.name}</h1>
      <p>${created.description}</p>
      <p>Due Date: ${new Date(created.dueDate).toLocaleString()}</p>
    `;
        const text = `${subject}\n\n${created.description}\n\nDue Date: ${new Date(created.dueDate).toLocaleString()}`;
        return { subject, html, text };
    }
}