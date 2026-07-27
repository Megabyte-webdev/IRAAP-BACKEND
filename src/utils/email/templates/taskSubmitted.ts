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
  const badgeText = data.isRoundFinished
    ? "Review Cycle Complete"
    : "Progress Update";

  const statusTitle = data.isRoundFinished
    ? "All Tasks Submitted & Ready"
    : "Progress Submitted";

  const messageContext = data.isRoundFinished
    ? `<strong>${data.studentName}</strong> has completed every requested change item in this cycle. The project revision framework is ready for compiled evaluation.`
    : `<strong>${data.studentName}</strong> updated a review task item. Please review the updated progress details below.`;

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
      ${badgeText}
    </p>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      ${statusTitle}
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello ${data.supervisorName},
    </p>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      ${messageContext}
    </p>

    <!-- Project Snapshot Data Table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; border-collapse: collapse; border: 1px solid #e2e8f0;">
      <tr>
        <td style="
          padding: 12px 16px;
          font-size: 12px;
          color: #64748b;
          background-color: #f8fafc;
          width: 30%;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          border-bottom: 1px solid #e2e8f0;
        ">
          Project
        </td>
        <td style="
          padding: 12px 16px;
          font-size: 14px;
          color: #0f172a;
          line-height: 1.5;
          border-bottom: 1px solid #e2e8f0;
        ">
          ${data.projectName}
        </td>
      </tr>

      <tr>
        <td style="
          padding: 12px 16px;
          font-size: 12px;
          color: #64748b;
          background-color: #f8fafc;
          width: 30%;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          border-bottom: 1px solid #e2e8f0;
        ">
          Student
        </td>
        <td style="
          padding: 12px 16px;
          font-size: 14px;
          color: #0f172a;
          line-height: 1.5;
          border-bottom: 1px solid #e2e8f0;
        ">
          ${data.studentName}
        </td>
      </tr>

      <tr>
        <td style="
          padding: 12px 16px;
          font-size: 12px;
          color: #64748b;
          background-color: #f8fafc;
          width: 30%;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          border-bottom: 1px solid #e2e8f0;
        ">
          Recent Update
        </td>
        <td style="
          padding: 12px 16px;
          font-size: 14px;
          color: #3aa6ee;
          font-weight: 600;
          line-height: 1.5;
          border-bottom: 1px solid #e2e8f0;
        ">
          &#10003; ${data.taskTitle}
        </td>
      </tr>

      <tr>
        <td style="
          padding: 12px 16px;
          font-size: 12px;
          color: #64748b;
          background-color: #f8fafc;
          width: 30%;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        ">
          Open Status
        </td>
        <td style="
          padding: 12px 16px;
          font-size: 14px;
          color: #0f172a;
          font-weight: 600;
          line-height: 1.5;
        ">
          ${
            data.isRoundFinished
              ? `<span style="color: #166534; font-weight: 700;">0 tasks remaining</span>`
              : `<span style="color: #b45309; font-weight: 700;">${data.remainingCount} tasks left</span>`
          }
        </td>
      </tr>
    </table>

    <!-- Primary Action Button (Table-based CTA) -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center" style="background-color: #3aa6ee;">
          <a href="${data.dashboardUrl}/supervisor" target="_blank" rel="noopener noreferrer"
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
            View Workspace Dashboard &rarr;
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
      Access your supervisor portal to track submission history and issue formal feedback notes.
    </p>
  `;

  return mainLayout(html);
};
