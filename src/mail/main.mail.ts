type TemplateOptions = {
  contentHtml: string;
  footerHtml?: string;
  preheader?: string;

  backgroundColor?: string; // outer background (default #f6f6f8)
  cardBgColor?: string; // inner card background (default #ffffff)
  cardBorderColor?: string; // inner card border (default #eaeaea)
  maxWidth?: number; // default 600
};

export const mailTemplates = {
  template({
    contentHtml,
    footerHtml = "Best regards,<br/>C-Flow Team",
    preheader = "",
    backgroundColor = "#f6f6f8",
    cardBgColor = "#ffffff",
    cardBorderColor = "#eaeaea",
    maxWidth = 600,
  }: TemplateOptions): string {
    const preheaderHtml = preheader
      ? `<span style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#fff;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(
          preheader
        )}</span>`
      : "";

    return `
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
  <body style="margin:0;padding:0;background:${backgroundColor};">
    ${preheaderHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${backgroundColor};">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${maxWidth}px;background:${cardBgColor};border:1px solid ${cardBorderColor};border-radius:12px;">
            <tr>
              <td style="padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
                <div style="text-align:center;margin-bottom:16px;">
                  <img 
                    src="http://c-flow.sit.kmutt.ac.th/api/public/files/Y291cnNlLTUxOGNmNDMwLTE1MWQtNDQzMS04NDkwLWM4MTFhZGM0M2Y2MS9maWxlLzcwOTJjMzU3LWNjMDAtNGNkMS1hZmViLTA1MDYyYjA3NzY0My5wbmc/Poster%20sitportfolio.png" 
                    alt="SIT Logo"
                    width="120"
                    style="display:inline-block;border:0;outline:none;text-decoration:none;width:120px;max-width:100%;"
                  />
                </div>
                ${contentHtml}
                <p style="margin:0 0 12px;color:#111111;">${footerHtml}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
  },

  textTemplate(lines: Array<string | false | null | undefined>): string {
    return lines.filter(Boolean).join("\n");
  },
};

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export { escapeHtml };
