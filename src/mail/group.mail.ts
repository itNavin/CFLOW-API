import { formatBangkok } from "src/util/time";

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
  }) {
    const { courseName, program, group } = params;

    const subject = `New group created: ${group.projectName} — ${courseName}`;

    const productLine = group.productName
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Product:</strong> ${escapeHtml(
          group.productName
        )}</p>`
      : "";

    const companyLine = group.company
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Company:</strong> ${escapeHtml(
          group.company
        )}</p>`
      : "";

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <style>
      a, a:visited, a:hover, a:active { color:#111111 !important; text-decoration:none !important; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;">
            <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
              <p style="margin:0 0 12px;color:#111111;">Dear user,</p>
              <p style="margin:0 8px 8px 0;color:#111111;">Your group has been created in <strong>${escapeHtml(
                courseName
              )}</strong> (${escapeHtml(program)}).</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
                group.codeNumber || "-"
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Project name:</strong> ${escapeHtml(
                group.projectName
              )}</p>
              ${productLine}
              ${companyLine}
              <p style="margin:12px 0 12px;color:#111111;">Please keep this information for your records. You’ll receive further updates from your course team.</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const textLines = [
      subject,
      "",
      "Dear user,",
      "",
      `Your group has been created in ${courseName} (${program}).`,
      `Group code: ${group.codeNumber || "-"}`,
      `Project name: ${group.projectName}`,
      group.productName ? `Product: ${group.productName}` : "",
      group.company ? `Company: ${group.company}` : "",
      "",
      "Please keep this information for your records. You’ll receive further updates from your course team.",
      "",
      "Best regards,",
      "C-Flow Team",
    ].filter(Boolean);

    const text = textLines.join("\n");

    return { subject, html, text };
  },

  /**
   * Lecturer mail
   * Called from controller as:
   * GroupMail.createGroupLecturerMail({
   *   courseName, program,
   *   advisor: { name, role: "ADVISOR" | "CO_ADVISOR" },
   *   group: { codeNumber, projectName, productName, company },
   *   students: Array<{ id: string; name: string; email: string | null }>
   * })
   */
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

    const subject = `New group created: ${group.projectName} — ${courseName}`;

    const productLine = group.productName
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Product:</strong> ${escapeHtml(
          group.productName
        )}</p>`
      : "";

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

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <style>
      a, a:visited, a:hover, a:active { color:#111111 !important; text-decoration:none !important; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;">
            <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
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
              <p style="margin:0 0 6px;color:#111111;"><strong>Project name:</strong> ${escapeHtml(
                group.projectName
              )}</p>
              ${productLine}
              ${companyLine}
              ${studentsHtml}
              <p style="margin:12px 0 12px;color:#111111;">Please review this group at your earliest convenience and reach out to students if coordination is needed.</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const studentLines =
      students.length > 0
        ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
        : ["(No students listed)"];

    const text = [
      subject,
      "",
      `Dear ${advisor.name || "Lecturer"},`,
      "",
      `A new group has been created in ${courseName} (${program}).`,
      `Your role: ${advisor.role}`,
      `Group code: ${group.codeNumber || "-"}`,
      `Project name: ${group.projectName}`,
      group.productName ? `Product: ${group.productName}` : "",
      group.company ? `Company: ${group.company}` : "",
      "",
      "Students:",
      ...studentLines,
      "",
      "Please review this group at your earliest convenience and reach out to students if coordination is needed.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]
      .filter(Boolean)
      .join("\n");

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

    const subject = `New group created: ${group.projectName} — ${courseName}`;

    const productLine = group.productName
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Product:</strong> ${escapeHtml(
          group.productName
        )}</p>`
      : "";

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

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <style>
      a, a:visited, a:hover, a:active { color:#111111 !important; text-decoration:none !important; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;">
            <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
              <p style="margin:0 0 12px;color:#111111;">Dear staff,</p>
              <p style="margin:0 8px 8px 0;color:#111111;">A new group has been created in <strong>${escapeHtml(
                courseName
              )}</strong> (${escapeHtml(program)}).</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
                group.codeNumber || "-"
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Project name:</strong> ${escapeHtml(
                group.projectName
              )}</p>
              ${productLine}
              ${companyLine}
              ${advisorsHtml}
              ${studentsHtml}
              <p style="margin:12px 0 12px;color:#111111;">This email is for your records and coordination purposes.</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const advisorLines = advisors.length
      ? advisors.map(
          (a) => `- ${a.role} — ${a.name}${a.email ? ` <${a.email}>` : ""}`
        )
      : ["(No advisors listed)"];

    const studentLines = students.length
      ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
      : ["(No students listed)"];

    const text = [
      subject,
      "",
      "Dear staff,",
      "",
      `A new group has been created in ${courseName} (${program}).`,
      `Group code: ${group.codeNumber || "-"}`,
      `Project name: ${group.projectName}`,
      group.productName ? `Product: ${group.productName}` : "",
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
    ]
      .filter(Boolean)
      .join("\n");

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
  }) {
    const { courseName, program, group } = params;

    const subject = `Group updated: ${group.projectName} — ${courseName}`;

    const productLine = group.productName
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Product:</strong> ${escapeHtml(
          group.productName
        )}</p>`
      : "";

    const companyLine = group.company
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Company:</strong> ${escapeHtml(
          group.company
        )}</p>`
      : "";

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <style>
      a, a:visited, a:hover, a:active { color:#111111 !important; text-decoration:none !important; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;">
            <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
              <p style="margin:0 0 12px;color:#111111;">Dear user,</p>
              <p style="margin:0 8px 8px 0;color:#111111;">Your group in <strong>${escapeHtml(
                courseName
              )}</strong> (${escapeHtml(program)}) has been updated.</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
                group.codeNumber || "-"
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Project name:</strong> ${escapeHtml(
                group.projectName
              )}</p>
              ${productLine}
              ${companyLine}
              <p style="margin:12px 0 12px;color:#111111;">If any further action is required, your course team will let you know.</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const text = [
      subject,
      "",
      "Dear user,",
      "",
      `Your group in ${courseName} (${program}) has been updated.`,
      `Group code: ${group.codeNumber || "-"}`,
      `Project name: ${group.projectName}`,
      group.productName ? `Product: ${group.productName}` : "",
      group.company ? `Company: ${group.company}` : "",
      "",
      "If any further action is required, your course team will let you know.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, html, text };
  },

  // --- LECTURER (per-advisor email; includes their role + student list)
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
    students: Array<{ id: string; name: string; email: string | null }>;
  }) {
    const { courseName, program, advisor, group, students } = params;

    const subject = `Group updated: ${group.projectName} — ${courseName}`;

    const productLine = group.productName
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Product:</strong> ${escapeHtml(
          group.productName
        )}</p>`
      : "";

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

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <style>
      a, a:visited, a:hover, a:active { color:#111111 !important; text-decoration:none !important; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;">
            <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
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
              <p style="margin:0 0 6px;color:#111111;"><strong>Project name:</strong> ${escapeHtml(
                group.projectName
              )}</p>
              ${productLine}
              ${companyLine}
              ${studentsHtml}
              <p style="margin:12px 0 12px;color:#111111;">Please review any changes and coordinate with students if needed.</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const studentLines = students.length
      ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
      : ["(No students listed)"];

    const text = [
      subject,
      "",
      `Dear ${advisor.name || "Lecturer"},`,
      "",
      `A group in ${courseName} (${program}) has been updated.`,
      `Your role: ${advisor.role}`,
      `Group code: ${group.codeNumber || "-"}`,
      `Project name: ${group.projectName}`,
      group.productName ? `Product: ${group.productName}` : "",
      group.company ? `Company: ${group.company}` : "",
      "",
      "Students:",
      ...studentLines,
      "",
      "Please review any changes and coordinate with students if needed.",
      "",
      "Best regards,",
      "C-Flow Team",
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, html, text };
  },

  // --- STAFF (one email to all staff; includes advisors + students)
  async updateGroupStaffMail(params: {
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

    const subject = `Group updated: ${group.projectName} — ${courseName}`;

    const productLine = group.productName
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Product:</strong> ${escapeHtml(
          group.productName
        )}</p>`
      : "";

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

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <style>
      a, a:visited, a:hover, a:active { color:#111111 !important; text-decoration:none !important; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;">
            <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
              <p style="margin:0 0 12px;color:#111111;">Dear staff,</p>
              <p style="margin:0 8px 8px 0;color:#111111;">A group has been updated in <strong>${escapeHtml(
                courseName
              )}</strong> (${escapeHtml(program)}).</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Group code:</strong> ${escapeHtml(
                group.codeNumber || "-"
              )}</p>
              <p style="margin:0 0 6px;color:#111111;"><strong>Project name:</strong> ${escapeHtml(
                group.projectName
              )}</p>
              ${productLine}
              ${companyLine}
              ${advisorsHtml}
              ${studentsHtml}
              <p style="margin:12px 0 12px;color:#111111;">This email is for your records and coordination purposes.</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const advisorLines = advisors.length
      ? advisors.map(
          (a) => `- ${a.role} — ${a.name}${a.email ? ` <${a.email}>` : ""}`
        )
      : ["(No advisors listed)"];

    const studentLines = students.length
      ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
      : ["(No students listed)"];

    const text = [
      subject,
      "",
      "Dear staff,",
      "",
      `A group has been updated in ${courseName} (${program}).`,
      `Group code: ${group.codeNumber || "-"}`,
      `Project name: ${group.projectName}`,
      group.productName ? `Product: ${group.productName}` : "",
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
    ]
      .filter(Boolean)
      .join("\n");

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
    const subject = `Group deleted: ${group.projectName} — ${courseName}`;

    const when = deletedAt ? formatBangkok(deletedAt) : undefined;

    const productLine = group.productName
      ? `<p style="margin:0 0 6px;color:#111111;"><strong>Product:</strong> ${escapeHtml(
          group.productName
        )}</p>`
      : "";

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

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <style>
      a, a:visited, a:hover, a:active { color:#111111 !important; text-decoration:none !important; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eaeaea;border-radius:12px;">
            <tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
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
              <p style="margin:0 0 6px;color:#111111;"><strong>Project name:</strong> ${escapeHtml(
                group.projectName
              )}</p>
              ${productLine}
              ${companyLine}
              ${advisorsHtml}
              ${studentsHtml}
              <p style="margin:12px 0 12px;color:#111111;">This email is for your records and coordination purposes.</p>
              <p style="margin:0 0 12px;color:#111111;">Best regards,<br/>C-Flow Team</p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();

    const advisorLines = advisors.length
      ? advisors.map(
          (a) => `- ${a.role} — ${a.name}${a.email ? ` <${a.email}>` : ""}`
        )
      : ["(No advisors listed)"];

    const studentLines = students.length
      ? students.map((s) => `- ${s.name}${s.email ? ` <${s.email}>` : ""}`)
      : ["(No students listed)"];

    const text = [
      subject,
      "",
      "Dear staff,",
      "",
      `A group in ${courseName} (${program}) was deleted.`,
      when ? `Deleted at: ${when}` : "",
      `Group code: ${group.codeNumber || "-"}`,
      `Project name: ${group.projectName}`,
      group.productName ? `Product: ${group.productName}` : "",
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
    ]
      .filter(Boolean)
      .join("\n");

    return { subject, html, text };
  },
};

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
