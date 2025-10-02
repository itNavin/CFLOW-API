export const authMail = {
    async loginMail(name: string) {
        const subject = `Login Alert for ${name}`;
        const html = `
      <h1>Login Alert</h1>
      <p>Hello ${name},</p>
      <p>We noticed a login to your account.</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
        const text = `Login Alert for ${name}\n\nHello ${name},\n\nWe noticed a login to your account.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    }
}