import { mainLayout } from "../layouts/mainLayout.js";

export const taskSubmissionTemplate = (data: {
  supervisorName: string;
  studentName: string;
  projectName: string;
  taskTitle: string;
  taskStatus: string;
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
      Action Required
    </p>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      Task Awaiting Review
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello ${data.supervisorName ? data.supervisorName : "Supervisor"},
    </p>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      <strong>${data.studentName ? data.studentName : "One of your students"}</strong> has submitted evidence for task review. Please verify the submission and provide feedback.
    </p>

    <!-- Submission Data Table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; border-collapse: collapse; border: 1px solid #e2e8f0;">
      <tr>
        <td style="
          padding: 12px 16px;
          font-size: 12px;
          color: #64748b;
          background-color: #f8fafc;
          width: 28%;
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
          width: 28%;
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
          width: 28%;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        ">
          Task
        </td>
        <td style="
          padding: 12px 16px;
          font-size: 14px;
          color: #0f172a;
          font-weight: 600;
          line-height: 1.5;
        ">
          ${data.taskTitle}
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
            Review Submission &rarr;
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
      You can verify the submission, view evidence, and provide feedback directly from your supervisor workspace.
    </p>
  `;

  return mainLayout(html);
};
