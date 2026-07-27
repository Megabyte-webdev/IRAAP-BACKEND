import { mainLayout } from "../layouts/mainLayout.js";

export const projectSignaledTemplate = (data: {
  studentName: string;
  projectName: string;
  supervisorName: string;
  dashboardUrl: string;
}) => {
  const html = `
    <!-- Category Label -->
    <p style="
      margin: 0 0 12px 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #3aa6ee;
    ">
      Publication Clearance
    </p>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      Academic Project Cleared &amp; Released
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello ${data.studentName},
    </p>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Your research supervisor, <strong>${data.supervisorName}</strong>, has completed the verification review of your corrections and has unlocked the publication gateway portal for your project.
    </p>

    <!-- Clearance Callout Box (Table-based) -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0; border-collapse: collapse;">
      <tr>
        <td style="
          background-color: #f8fafc;
          border-left: 4px solid #3aa6ee;
          padding: 16px 20px;
        ">
          <p style="
            margin: 0 0 4px 0;
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          ">
            Workflow Authorization Status
          </p>
          <p style="
            margin: 0;
            font-size: 16px;
            color: #0f172a;
            font-weight: 700;
          ">
            Ready For Final Archival Upload
          </p>
        </td>
      </tr>
    </table>

    <!-- Project Data Breakdown Table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; border-collapse: collapse; border: 1px solid #e2e8f0;">
      <tr>
        <td style="padding: 12px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
          Project Track
        </td>
        <td style="padding: 12px 16px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
          ${data.projectName}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; font-weight: 600;">
          Assigned Reviewer
        </td>
        <td style="padding: 12px 16px; font-size: 14px; color: #0f172a;">
          ${data.supervisorName}
        </td>
      </tr>
    </table>

    <!-- Primary Action Button (Table-based CTA) -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center" style="background-color: #3aa6ee;">
          <a href="${data.dashboardUrl}/student/dashboard" target="_blank" rel="noopener noreferrer"
            style="
              background-color: #3aa6ee;
              color: #ffffff;
              padding: 12px 28px;
              font-size: 14px;
              font-weight: 600;
              text-decoration: none;
              display: inline-block;
              border: 1px solid #3aa6ee;
            ">
            Proceed to Publication &rarr;
          </a>
        </td>
      </tr>
    </table>

    <!-- Divider Line -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px 0;">
      <tr>
        <td style="border-top: 1px solid #e2e8f0; font-size: 0; line-height: 0;">&nbsp;</td>
      </tr>
    </table>

    <p style="
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    ">
      You can now log into your student dashboard to submit your finalized copy to the institutional archive queue.
    </p>
  `;

  return mainLayout(html);
};
