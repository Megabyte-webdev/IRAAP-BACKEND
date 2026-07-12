import { mainLayout } from "../layouts/mainLayout.js";

export const projectSignaledTemplate = (data: {
  studentName: string;
  projectName: string;
  supervisorName: string;
  dashboardUrl: string;
}) => {
  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background-color: #f0fdf4; color: #166534; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
        Cleared For Publication
      </span>
    </div>

    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
      Academic Project Signaled & Released
    </h2>

    <p style="color: #475569; font-size: 14px; text-align: center; margin: 0 0 24px 0; line-height: 1.6;">
      Hello ${data.studentName}, your research supervisor, <strong>${data.supervisorName}</strong>, has completed the manual verification review of your corrections and has explicitly unlocked the publication gateway portal for your project.
    </p>

    <!-- Publication Clearance Callout Container -->
    <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        Workflow Authorization Lock Status
      </p>
      <p style="margin: 6px 0 0 0; font-size: 16px; color: #15803d; font-weight: 800;">
        Ready For Final Archival Upload
      </p>
    </div>

    <!-- Table Properties Frame Core -->
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 24px 0;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Project Track</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; font-weight: 600;">Assigned Reviewer</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #0f172a;">${data.supervisorName}</td>
        </tr>
      </table>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
      You can now log into your student dashboard terminal workspace to access your profile files and officially submit the finalized copy to the institutional request queue.
    </p>

    <div style="text-align: center; margin-top: 28px; padding-bottom: 8px;">
      <a href="${data.dashboardUrl}/student/dashboard" target="_blank" rel="noopener noreferrer" style="background-color: #22c55e; color: #ffffff; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;">
        Proceed to Publication
      </a>
    </div>
  `;

  return mainLayout(html);
};
