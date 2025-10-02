export const courseMail = {
    createCourseMail: async (courseName: string, created: any) => {
        const subject = `New Course Created: ${courseName}`;
        const html = `
      <h1>Course Created</h1>
      <p>The course "${courseName}" has been successfully created.</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
        const text = `New Course Created: ${courseName}\n\nThe course "${courseName}" has been successfully created.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    },

    updateCourseMail: async (courseName: string, updated: any) => {
        const subject = `Course Updated: ${courseName}`;
        const html = `
      <h1>Course Updated</h1>
      <p>The course "${courseName}" has been successfully updated.</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
        const text = `Course Updated: ${courseName}\n\nThe course "${courseName}" has been successfully updated.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    }
}