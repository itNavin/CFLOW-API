import { create } from "domain";

export const GroupMail = {
    createGroupStudentMail:async (newGroup: any) => {
        const subject = `New Group Created: ${newGroup.projectName}`;
        const html = `
      <h1>Group Created</h1>
      <p>Your group "${newGroup.projectName}" has been successfully created.</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
        const text = `New Group Created: ${newGroup.projectName}\n\nYour group "${newGroup.projectName}" has been successfully created.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    },
    createGroupLecturerMail:async (newGroup: any) => {
        const subject = `New Group Created: ${newGroup.projectName}`;
        const html = `
      <h1>Group Created</h1>
      <p>A new group "${newGroup.projectName}" has been successfully created.</p>
      <p>Best regards,<br/>C-Flow Team</p>
    `;
        const text = `New Group Created: ${newGroup.projectName}\n\nA new group "${newGroup.projectName}" has been successfully created.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    },
    createGroupStaffMail:async (newGroup: any) => {
        const subject = `New Group Created: ${newGroup.projectName}`;
        const html = `
        <h1>Group Created</h1>
        <p>A new group "${newGroup.projectName}" has been successfully created.</p>
        <p>Best regards,<br/>C-Flow Team</p>
      `;
        const text = `New Group Created: ${newGroup.projectName}\n\nA new group "${newGroup.projectName}" has been successfully created.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    },
    updateGroupStudentMail:async (updatedGroup: any) => {
        const subject = `Group Updated: ${updatedGroup.projectName}`;
        const html = `
        <h1>Group Updated</h1>
        <p>Your group "${updatedGroup.projectName}" has been successfully updated.</p>
        <p>Best regards,<br/>C-Flow Team</p>
      `;
        const text = `Group Updated: ${updatedGroup.projectName}\n\nYour group "${updatedGroup.projectName}" has been successfully updated.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    },
    updateGroupLecturerMail:async (updatedGroup: any) => {
        const subject = `Group Updated: ${updatedGroup.projectName}`;
        const html = `
        <h1>Group Updated</h1>
        <p>The group "${updatedGroup.projectName}" has been successfully updated.</p>
        <p>Best regards,<br/>C-Flow Team</p>
      `;
        const text = `Group Updated: ${updatedGroup.projectName}\n\nThe group "${updatedGroup.projectName}" has been successfully updated.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    },
    updateGroupStaffMail:async (updatedGroup: any) => {
        const subject = `Group Updated: ${updatedGroup.projectName}`;
        const html = `
        <h1>Group Updated</h1>
        <p>The group "${updatedGroup.projectName}" has been successfully updated.</p>
        <p>Best regards,<br/>C-Flow Team</p>
      `;
        const text = `Group Updated: ${updatedGroup.projectName}\n\nThe group "${updatedGroup.projectName}" has been successfully updated.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    },
    deleteGroupStaffMail:async (groupId: string) => {
        const subject = `Group Deleted: ${groupId}`;
        const html = `
        <h1>Group Deleted</h1>
        <p>The group with ID "${groupId}" has been successfully deleted.</p>
        <p>Best regards,<br/>C-Flow Team</p>
      `;
        const text = `Group Deleted: ${groupId}\n\nThe group with ID "${groupId}" has been successfully deleted.\n\nBest regards,\nC-Flow Team`;
        return { subject, html, text };
    }
}