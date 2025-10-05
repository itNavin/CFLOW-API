export const feedbackMail = {
  createStudentFeedbackMail: async (
    assignmentName: string,
    projectName: string
  ) => {
    const subject = `New Feedback Received for ${assignmentName}`;
    const html = `
      <h1>New Feedback Received</h1>
      <p>You have received new feedback for your submission in the assignment "<strong>${assignmentName}</strong>" for the project "<strong>${projectName}</strong>".</p>
      <p>Please log in to your account to view the feedback.</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
    const text = `New Feedback Received for ${assignmentName}\n\nYou have received new feedback for your submission in the assignment "${assignmentName}" for the project "${projectName}".\n\nPlease log in to your account to view the feedback.\n\nBest regards,\nC-Flow Team`;
    return { subject, html, text };
  },
  createLecturerFeedbackMail: async (assignmentName: string, projectName: string) => {
    const subject = `Feedback Submitted for ${assignmentName}`;
    const html = `
      <h1>Feedback Submitted</h1>
      <p>You have successfully submitted feedback for the assignment "<strong>${assignmentName}</strong>" for the project "<strong>${projectName}</strong>".</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
    const text = `Feedback Submitted for ${assignmentName}\n\nYou have successfully submitted feedback for the assignment "${assignmentName}" for the project "${projectName}".\n\nBest regards,\nC-Flow Team`;
    return { subject, html, text };
  }
};