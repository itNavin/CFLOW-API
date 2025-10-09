import { mailTemplates, escapeHtml } from "../mail/main.mail";
import { formatBangkok } from "src/util/time";

type PlainUser = { id: string; name: string; email: string | null };
type AdvisorInfo = {
  name: string;
  role: "ADVISOR" | "CO_ADVISOR";
  email?: string | null;
};

// Helper to choose which group name to display based on program
const getDisplayedGroupName = (
  program: string,
  group: { projectName: string; productName: string | null }
) => {
  const isCS = (program || "").toUpperCase() === "CS";
  return isCS ? group.productName || group.projectName : group.projectName;
};

export const GroupMail = {
  async createGroupStudentMail(params: {
    courseName: string;
    program: "CS" | "DSI" | string;
    group: {
      codeNumber: string;
      projectName: string;
      productName: string | null;
      company: string | null;
    };
    recipientName: string;
  }) {
    const { courseName, program, group, recipientName } = params;

    const displayName = getDisplayedGroupName(program, group);
    const isCS = (program || "").toUpperCase() === "CS";
    const nameLabel = isCS ? "Product name" : "Project name";

    // Use the displayed name in subject/preheader too
    const subject = `New group created: ${displayName} — ${courseName}`;

    // No separate product line needed anymore; we show only one “name” line
    const companyLine = group.company
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Company:</strong> ${escapeHtml(
          group.company
        )}</p>`
      : "";

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">Your group has been created in <strong>${escapeHtml(
      courseName
    )}</strong> (${escapeHtml(program)}).</p>
<p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
      group.codeNumber || "-"
    )}</p>
<p style="margin:0 0 6px;color:#111111;"><strong>${escapeHtml(
      nameLabel
    )}:</strong> ${escapeHtml(displayName)}</p>
${companyLine}
<p style="margin:12px 0 12px;color:#111111;">Please keep this information for your records. You’ll receive further updates from your course team.</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `New group created: ${displayName}`,
    });

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      `Your group has been created in ${courseName} (${program}).`,
      `Group code: ${group.codeNumber || "-"}`,
      `${nameLabel}: ${displayName}`,
      group.company ? `Company: ${group.company}` : "",
      "",
      "Please keep this information for your records. You’ll receive further updates from your course team.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },
  async createGroupLecturerMail(params: {
    courseName: string;
    program: "CS" | "DSI" | string;
    advisor: { name: string; role: "ADVISOR" | "CO_ADVISOR" };
    group: {
      codeNumber: string;
      projectName: string;
      productName: string | null;
      company: string | null;
    };
    students: Array<{ id: string; name: string; email: string | null }>;
  }) {
    const { courseName, program, advisor, group, students } = params;

    const displayName = getDisplayedGroupName(program, group);
    const isCS = (program || "").toUpperCase() === "CS";
    const nameLabel = isCS ? "Product name" : "Project name";

    const subject = `New group created: ${displayName} — ${courseName}`;

    const companyLine = group.company
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Company:</strong> ${escapeHtml(
          group.company
        )}</p>`
      : "";

    const studentsHtml =
      students.length > 0
        ? `
<p style="margin:12px 0 6px;color:#111111;"><strong>Students:</strong></p>
<ul style="margin:0 0 12px 18px;padding:0;color:#111111;">
  ${students
    .map((s) => {
      const email = s.email ? ` &lt;${escapeHtml(s.email)}&gt;` : "";
      return `<li style="margin:0 4px 4px 0;">${escapeHtml(
        s.name
      )}${email}</li>`;
    })
    .join("")}
</ul>`
        : `<p style="margin:12px 0 12px;color:#6b7280;">(No students listed)</p>`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(
      advisor.name || "Lecturer"
    )},</p>
<p style="margin:0 8px 8px 0;color:#111111;">A new group has been created in <strong>${escapeHtml(
      courseName
    )}</strong> (${escapeHtml(program)}).</p>
<p style="margin:0 0 6px;color:#111111;"><strong>Your role:</strong> ${escapeHtml(
      advisor.role
    )}</p>
<p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
      group.codeNumber || "-"
    )}</p>
<p style="margin:0 0 6px;color:#111111;"><strong>${escapeHtml(
      nameLabel
    )}:</strong> ${escapeHtml(displayName)}</p>
${companyLine}
${studentsHtml}
<p style="margin:12px 0 12px;color:#111111;">Please review this group at your earliest convenience and reach out to students if coordination is needed.</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `New group created: ${displayName}`,
    });

    const studentLines =
      students.length > 0
        ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
        : ["(No students listed)"];

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${advisor.name || "Lecturer"},`,
      "",
      `A new group has been created in ${courseName} (${program}).`,
      `Your role: ${advisor.role}`,
      `Group code: ${group.codeNumber || "-"}`,
      `${nameLabel}: ${displayName}`,
      group.company ? `Company: ${group.company}` : "",
      "",
      "Students:",
      ...studentLines,
      "",
      "Please review this group at your earliest convenience and reach out to students if coordination is needed.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  async createGroupStaffMail(params: {
    courseName: string;
    program: "CS" | "DSI" | string;
    group: {
      codeNumber: string;
      projectName: string;
      productName: string | null;
      company: string | null;
    };
    advisors: Array<{
      name: string;
      role: "ADVISOR" | "CO_ADVISOR";
      email?: string | null;
    }>;
    students: Array<{ id: string; name: string; email: string | null }>;
  }) {
    const { courseName, program, group, advisors, students } = params;

    const displayName = getDisplayedGroupName(program, group);
    const isCS = (program || "").toUpperCase() === "CS";
    const nameLabel = isCS ? "Product name" : "Project name";

    const subject = `New group created: ${displayName} — ${courseName}`;

    const companyLine = group.company
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Company:</strong> ${escapeHtml(
          group.company
        )}</p>`
      : "";

    const advisorsHtml = advisors.length
      ? `
<p style="margin:12px 0 6px;color:#111111;"><strong>Advisors:</strong></p>
<ul style="margin:0 0 12px 18px;padding:0;color:#111111;">
  ${advisors
    .map((a) => {
      const email = a.email ? ` &lt;${escapeHtml(a.email)}&gt;` : "";
      return `<li style="margin:0 4px 4px 0;">${escapeHtml(
        a.role
      )} — ${escapeHtml(a.name)}${email}</li>`;
    })
    .join("")}
</ul>`
      : `<p style="margin:12px 0 12px;color:#6b7280;">(No advisors listed)</p>`;

    const studentsHtml = students.length
      ? `
<p style="margin:12px 0 6px;color:#111111;"><strong>Students:</strong></p>
<ul style="margin:0 0 12px 18px;padding:0;color:#111111;">
  ${students
    .map((s) => {
      const email = s.email ? ` &lt;${escapeHtml(s.email)}&gt;` : "";
      return `<li style="margin:0 4px 4px 0;">${escapeHtml(
        s.name
      )}${email}</li>`;
    })
    .join("")}
</ul>`
      : `<p style="margin:12px 0 12px;color:#6b7280;">(No students listed)</p>`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear staff,</p>
<p style="margin:0 8px 8px 0;color:#111111;">A new group has been created in <strong>${escapeHtml(
      courseName
    )}</strong> (${escapeHtml(program)}).</p>
<p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
      group.codeNumber || "-"
    )}</p>
<p style="margin:0 0 6px;color:#111111;"><strong>${escapeHtml(
      nameLabel
    )}:</strong> ${escapeHtml(displayName)}</p>
${companyLine}
${advisorsHtml}
${studentsHtml}
<p style="margin:12px 0 12px;color:#111111;">This email is for your records and coordination purposes.</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `New group created: ${displayName}`,
    });

    const advisorLines = advisors.length
      ? advisors.map(
          (a) => `- ${a.role} — ${a.name}${a.email ? ` <${a.email}>` : ""}`
        )
      : ["(No advisors listed)"];

    const studentLines = students.length
      ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
      : ["(No students listed)"];

    const text = mailTemplates.textTemplate([
      subject,
      "",
      "Dear staff,",
      "",
      `A new group has been created in ${courseName} (${program}).`,
      `Group code: ${group.codeNumber || "-"}`,
      `${nameLabel}: ${displayName}`,
      group.company ? `Company: ${group.company}` : "",
      "",
      "Advisors:",
      ...advisorLines,
      "",
      "Students:",
      ...studentLines,
      "",
      "This email is for your records and coordination purposes.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  async deleteGroupStaffMail(params: {
    courseName: string;
    program: "CS" | "DSI" | string;
    group: {
      codeNumber: string | null;
      projectName: string;
      productName: string | null;
      company: string | null;
    };
    advisors: Array<{
      name: string;
      role: "ADVISOR" | "CO_ADVISOR";
      email?: string | null;
    }>;
    students: Array<{ id: string; name: string; email: string | null }>;
    deletedAt?: Date;
  }) {
    const { courseName, program, group, advisors, students, deletedAt } =
      params;

    const isCS = (program || "").toUpperCase() === "CS";
    const displayName = isCS
      ? group.productName || group.projectName
      : group.projectName;
    const nameLabel = isCS ? "Product name" : "Project name";

    const subject = `Group deleted: ${displayName} — ${courseName}`;
    const when = deletedAt ? formatBangkok(deletedAt) : undefined;

    const companyLine = group.company
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Company:</strong> ${escapeHtml(
          group.company
        )}</p>`
      : "";

    const advisorsHtml = advisors.length
      ? `
<p style="margin:12px 0 6px;color:#111111;"><strong>Advisors:</strong></p>
<ul style="margin:0 0 12px 18px;padding:0;color:#111111;">
  ${advisors
    .map((a) => {
      const email = a.email ? ` &lt;${escapeHtml(a.email)}&gt;` : "";
      return `<li style="margin:0 4px 4px 0;">${escapeHtml(
        a.role
      )} — ${escapeHtml(a.name)}${email}</li>`;
    })
    .join("")}
</ul>`
      : `<p style="margin:12px 0 12px;color:#6b7280;">(No advisors listed)</p>`;

    const studentsHtml = students.length
      ? `
<p style="margin:12px 0 6px;color:#111111;"><strong>Students:</strong></p>
<ul style="margin:0 0 12px 18px;padding:0;color:#111111;">
  ${students
    .map((s) => {
      const email = s.email ? ` &lt;${escapeHtml(s.email)}&gt;` : "";
      return `<li style="margin:0 4px 4px 0;">${escapeHtml(
        s.name
      )}${email}</li>`;
    })
    .join("")}
</ul>`
      : `<p style="margin:12px 0 12px;color:#6b7280;">(No students listed)</p>`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear staff,</p>
<p style="margin:0 8px 8px 0;color:#111111;">A group in <strong>${escapeHtml(
      courseName
    )}</strong> (${escapeHtml(program)}) was deleted.</p>
${
  when
    ? `<p style="margin:0 0 12px;color:#111111;"><strong>Deleted at:</strong> ${escapeHtml(
        when
      )}</p>`
    : ""
}
<p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
      group.codeNumber || "-"
    )}</p>
<p style="margin:0 0 6px;color:#111111;"><strong>${escapeHtml(
      nameLabel
    )}:</strong> ${escapeHtml(displayName)}</p>
${companyLine}
${advisorsHtml}
${studentsHtml}
<p style="margin:12px 0 12px;color:#111111;">This email is for your records and coordination purposes.</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `Group deleted: ${displayName}`,
    });

    const advisorLines = advisors.length
      ? advisors.map(
          (a) => `- ${a.role} — ${a.name}${a.email ? ` <${a.email}>` : ""}`
        )
      : ["(No advisors listed)"];

    const studentLines = students.length
      ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
      : ["(No students listed)"];

    const text = mailTemplates.textTemplate([
      subject,
      "",
      "Dear staff,",
      "",
      `A group in ${courseName} (${program}) was deleted.`,
      when ? `Deleted at: ${when}` : "",
      `Group code: ${group.codeNumber || "-"}`,
      `${nameLabel}: ${displayName}`,
      group.company ? `Company: ${group.company}` : "",
      "",
      "Advisors:",
      ...advisorLines,
      "",
      "Students:",
      ...studentLines,
      "",
      "This email is for your records and coordination purposes.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  async updateGroupStudentMail(params: {
    courseName: string;
    program: "CS" | "DSI" | string;
    group: {
      codeNumber: string;
      projectName: string;
      productName: string | null;
      company: string | null;
    };
    students: PlainUser[]; // [{id,name,email|null}]
    advisors: AdvisorInfo[]; // [{name, role, email?}]
    recipientName: string;
  }) {
    const { courseName, program, group, students, advisors, recipientName } =
      params;

    // Decide which name to display based on program
    const isCS = (program || "").toUpperCase() === "CS";
    const displayName = isCS
      ? group.productName || group.projectName
      : group.projectName;
    const nameLabel = isCS ? "Product name" : "Project name";

    // Use the *displayed* name consistently
    const subject = `Group updated: ${displayName} — ${courseName}`;

    const companyLine = group.company
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Company:</strong> ${escapeHtml(
          group.company
        )}</p>`
      : "";

    const studentsHtml = students.length
      ? `
<p style="margin:12px 0 6px;color:#111111;"><strong>Students:</strong></p>
<ul style="margin:0 0 12px 18px;padding:0;color:#111111;">
  ${students
    .map((s) => {
      const email = s.email ? ` &lt;${escapeHtml(s.email)}&gt;` : "";
      return `<li style="margin:0 4px 4px 0;">${escapeHtml(
        s.name
      )}${email}</li>`;
    })
    .join("")}
</ul>`
      : `<p style="margin:12px 0 12px;color:#6b7280;">(No students listed)</p>`;

    const advisorsHtml = advisors.length
      ? `
<p style="margin:12px 0 6px;color:#111111;"><strong>Advisors:</strong></p>
<ul style="margin:0 0 12px 18px;padding:0;color:#111111;">
  ${advisors
    .map((a) => {
      const email = a.email ? ` &lt;${escapeHtml(a.email)}&gt;` : "";
      return `<li style="margin:0 4px 4px 0;">${escapeHtml(
        a.role
      )} — ${escapeHtml(a.name)}${email}</li>`;
    })
    .join("")}
</ul>`
      : `<p style="margin:12px 0 12px;color:#6b7280;">(No advisors listed)</p>`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(recipientName)},</p>
<p style="margin:0 8px 8px 0;color:#111111;">Your group in <strong>${escapeHtml(
      courseName
    )}</strong> (${escapeHtml(program)}) has been updated.</p>
<p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
      group.codeNumber || "-"
    )}</p>
<p style="margin:0 0 6px;color:#111111;"><strong>${escapeHtml(
      nameLabel
    )}:</strong> ${escapeHtml(displayName)}</p>
${companyLine}
${studentsHtml}
${advisorsHtml}
<p style="margin:12px 0 12px;color:#111111;">If any further action is required, your course team will let you know.</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `Group updated: ${displayName}`,
    });

    const studentLines = students.length
      ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
      : ["(No students listed)"];

    const advisorLines = advisors.length
      ? advisors.map(
          (a) => `- ${a.role} — ${a.name}${a.email ? ` <${a.email}>` : ""}`
        )
      : ["(No advisors listed)"];

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${recipientName},`,
      "",
      `Your group in ${courseName} (${program}) has been updated.`,
      `Group code: ${group.codeNumber || "-"}`,
      `${nameLabel}: ${displayName}`,
      group.company ? `Company: ${group.company}` : "",
      "",
      "Students:",
      ...studentLines,
      "",
      "Advisors:",
      ...advisorLines,
      "",
      "If any further action is required, your course team will let you know.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },

  async updateGroupLecturerMail(params: {
    courseName: string;
    program: "CS" | "DSI" | string;
    advisor: { name: string; role: "ADVISOR" | "CO_ADVISOR" };
    group: {
      codeNumber: string;
      projectName: string;
      productName: string | null;
      company: string | null;
    };
    students: PlainUser[];
    advisors: AdvisorInfo[];
  }) {
    const { courseName, program, advisor, group, students, advisors } = params;

    const isCS = (program || "").toUpperCase() === "CS";
    const displayName = isCS
      ? group.productName || group.projectName
      : group.projectName;
    const nameLabel = isCS ? "Product name" : "Project name";

    const subject = `Group updated: ${displayName} — ${courseName}`;

    const companyLine = group.company
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Company:</strong> ${escapeHtml(
          group.company
        )}</p>`
      : "";

    const studentsHtml = students.length
      ? `
<p style="margin:12px 0 6px;color:#111111;"><strong>Students:</strong></p>
<ul style="margin:0 0 12px 18px;padding:0;color:#111111;">
  ${students
    .map((s) => {
      const email = s.email ? ` &lt;${escapeHtml(s.email)}&gt;` : "";
      return `<li style="margin:0 4px 4px 0;">${escapeHtml(
        s.name
      )}${email}</li>`;
    })
    .join("")}
</ul>`
      : `<p style="margin:12px 0 12px;color:#6b7280;">(No students listed)</p>`;

    const advisorsHtml = advisors.length
      ? `
<p style="margin:12px 0 6px;color:#111111;"><strong>Advisors:</strong></p>
<ul style="margin:0 0 12px 18px;padding:0;color:#111111;">
  ${advisors
    .map((a) => {
      const email = a.email ? ` &lt;${escapeHtml(a.email)}&gt;` : "";
      const markYou =
        a.name.trim().toLowerCase() ===
        (advisor.name || "").trim().toLowerCase()
          ? " <em>(you)</em>"
          : "";
      return `<li style="margin:0 4px 4px 0;">${escapeHtml(
        a.role
      )} — ${escapeHtml(a.name)}${email}${markYou}</li>`;
    })
    .join("")}
</ul>`
      : `<p style="margin:12px 0 12px;color:#6b7280;">(No advisors listed)</p>`;

    const contentHtml = `
<p style="margin:0 0 12px;color:#111111;">Dear ${escapeHtml(
      advisor.name || "Lecturer"
    )},</p>
<p style="margin:0 8px 8px 0;color:#111111;">A group in <strong>${escapeHtml(
      courseName
    )}</strong> (${escapeHtml(program)}) has been updated.</p>
<p style="margin:0 0 6px;color:#111111;"><strong>Your role:</strong> ${escapeHtml(
      advisor.role
    )}</p>
<p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
      group.codeNumber || "-"
    )}</p>
<p style="margin:0 0 6px;color:#111111;"><strong>${escapeHtml(
      nameLabel
    )}:</strong> ${escapeHtml(displayName)}</p>
${companyLine}
${studentsHtml}
${advisorsHtml}
<p style="margin:12px 0 12px;color:#111111;">Please review any changes and coordinate with students if needed.</p>
`.trim();

    const html = mailTemplates.template({
      contentHtml,
      preheader: `Group updated: ${displayName}`,
    });

    const studentLines = students.length
      ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
      : ["(No students listed)"];

    const advisorLines = advisors.length
      ? advisors.map((a) => {
          const you =
            a.name.trim().toLowerCase() ===
            (advisor.name || "").trim().toLowerCase()
              ? " (you)"
              : "";
          return `- ${a.role} — ${a.name}${
            a.email ? ` <${a.email}>` : ""
          }${you}`;
        })
      : ["(No advisors listed)"];

    const text = mailTemplates.textTemplate([
      subject,
      "",
      `Dear ${advisor.name || "Lecturer"},`,
      "",
      `A group in ${courseName} (${program}) has been updated.`,
      `Your role: ${advisor.role}`,
      `Group code: ${group.codeNumber || "-"}`,
      `${nameLabel}: ${displayName}`,
      group.company ? `Company: ${group.company}` : "",
      "",
      "Students:",
      ...studentLines,
      "",
      "Advisors:",
      ...advisorLines,
      "",
      "Please review any changes and coordinate with students if needed.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]);

    return { subject, html, text };
  },
};
