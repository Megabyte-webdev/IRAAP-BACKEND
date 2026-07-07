import { mainLayout } from "../layouts/mainLayout.js";

export const revisionSubmittedTemplate = (data: {
  supervisorName: string;
  studentName: string;
  projectName: string;
  versionNumber: number;
  changeNote?: string;
  dashboardUrl: string;
}) => {
  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background-color: #dbeafe; color: #0c4a6e; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
        Revision Compiled
      </span>
    </div>

    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
      Project Revision Version Ready
    </h2>

    <p style="color: #475569; font-size: 14px; text-align: center; margin: 0 0 24px 0; line-height: 1.6;">
      Hello ${data.supervisorName}, <strong>${data.studentName}</strong> has uploaded a consolidated revised document version containing all corrections requested in the prior review round cycle.
    </p>

    <!-- Version Control Metadata Callout Container -->
    <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 11px; color: #0c4a6e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        Repository Snapshot Pointer
      </p>
      <p style="margin: 6px 0 0 0; font-size: 16px; color: #0369a1; font-weight: 800;">
        Version ${data.versionNumber}
      </p>
      ${
        data.changeNote
          ? `<p style="margin: 10px 0 0 0; padding: 10px; background-color: #ffffff; border-radius: 4px; border: 1px solid #e0f2fe; font-size: 13px; color: #334155; font-style: italic; line-height: 1.4;">
              "${data.changeNote}"
             </p>`
          : ""
      }
    </div>

    <!-- Table Properties Frame Core -->
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 24px 0;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Project Archive</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; font-weight: 600;">Candidate Student</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #0f172a;">${data.studentName}</td>
        </tr>
      </table>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
      You can evaluate this revision, look over historical versions tracking timeline indexes, and manage approval status directly via your dashboard portal.
    </p>

    <div style="text-align: center; margin-top: 28px; padding-bottom: 8px;">
      <a href="${data.dashboardUrl}/supervisor/projects" target="_blank" rel="noopener noreferrer" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;">
        Review New Version
      </a>
    </div>
  `;

  return mainLayout(html);
};
