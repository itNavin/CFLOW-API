export const submissionMail = {
    createStudentSubmissionMail: async (assignmentName: string, groupName: string) => {
        const subject = `Submission Received: ${assignmentName}`;
        const html = `
      <h1>Submission Received</h1>
      <p>Your submission for the assignment "${assignmentName}" has been received.</p>
      <p>Group: ${groupName}</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
        const text = `Submission Received: ${assignmentName}\n\nYour submission for the assignment "${assignmentName}" has been received.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    },
    createLecturerSubmissionMail: async (assignmentName: string, groupName: string) => {
        const subject = `New Submission: ${assignmentName}`;
        const html = `
      <h1>New Submission</h1>
      <p>A new submission for the assignment "${assignmentName}" has been made.</p>
      <p>Group: ${groupName}</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
        const text = `New Submission: ${assignmentName}\n\nA new submission for the assignment "${assignmentName}" has been made.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    }
}