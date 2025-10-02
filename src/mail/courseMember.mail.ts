export const courseMemberMail = {
    addMemberMail: async (coursename: string) => {
        const subject = `Added to Course ${coursename}`;
        const html = `
      <h1>Added to Course ${coursename}</h1>
      <p>You have been successfully added to a course.</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
        const text = `Added to Course ${coursename}\n\nYou have been successfully added to a course.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    },

    deleteMemberMail: async (coursename: string) => {
        const subject = `You are not belongs to the course ${coursename}`;
        const html = `
        <h1>Removed from Course ${coursename}</h1>
        <p>You have been removed from the course.</p>
        <p>Best regards,<br/>C-Flow Team</p>
      `;
        const text = `Removed from Course ${coursename}\n\nYou have been removed from the course.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    }
}