import { mainLayout } from "../layouts/mainLayout.js";

export const taskSubmittedTemplate = (data: {
  supervisorName: string;
  studentName: string;
  projectName: string;
  taskTitle: string;
  remainingCount: number;
  isRoundFinished: boolean;
  dashboardUrl: string;
}) => {
  const badgeColor = data.isRoundFinished ? "#dcfce7" : "#fffbeb";
  const badgeTextColor = data.isRoundFinished ? "#166534" : "#92400e";
  const badgeText = data.isRoundFinished
    ? "Review Cycle Complete"
    : "Progress Update";

  const statusTitle = data.isRoundFinished
    ? "All Tasks Submitted & Ready"
    : "Progress Submitted";

  const messageContext = data.isRoundFinished
    ? `Great news! <strong>${data.studentName}</strong> has completed every requested change item in this cycle. The project revision framework is ready for compiled evaluation submission.`
    : `<strong>${data.studentName}</strong> updated a review task checklist node. See item parameters detail breakdown history below.`;

  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background-color: ${badgeColor}; color: ${badgeTextColor}; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
        ${badgeText}
      </span>
    </div>

    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
      ${statusTitle}
    </h2>

    <p style="color: #475569; font-size: 14px; text-align: center; margin: 0 0 24px 0; line-height: 1.6;">
      Hello ${data.supervisorName}, ${messageContext}
    </p>

    <!-- Project Snapshot Block Matrix -->
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 24px 0;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Project</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Student</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${data.studentName}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Recent Update</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #2563eb; font-weight: 500; border-bottom: 1px solid #e2e8f0;">✓ ${data.taskTitle}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; font-weight: 600;">Open Status</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #0f172a; font-weight: 700;">
            ${data.isRoundFinished ? `<span style="color: #166534;">0 tasks remaining</span>` : `<span style="color: #b45309;">${data.remainingCount} tasks left</span>`}
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 28px; padding-bottom: 8px;">
      <a href="${data.dashboardUrl}/supervisor" target="_blank" rel="noopener noreferrer" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;">
        View Workspace Dashboard
      </a>
    </div>
  `;

  return mainLayout(html);
};
