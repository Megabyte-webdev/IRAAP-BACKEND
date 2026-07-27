import { mainLayout } from "../layouts/mainLayout.js";

export const assignedTemplate = (data: {
  studentName: string;
  taskTitle: string;
  deadline?: string;
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
      New Task Assigned
    </p>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      ${data.taskTitle}
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello ${data.studentName},
    </p>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      A new milestone task has been added to your project roadmap on IRAAP. You can view the details and track your progress in your workspace.
    </p>

    <!-- Task Details Data Table -->
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
          Task Title
        </td>
        <td style="
          padding: 12px 16px;
          font-size: 14px;
          color: #3aa6ee;
          font-weight: 600;
          line-height: 1.5;
          border-bottom: 1px solid #e2e8f0;
        ">
          ${data.taskTitle}
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
          Deadline
        </td>
        <td style="
          padding: 12px 16px;
          font-size: 14px;
          color: #0f172a;
          font-weight: 500;
          line-height: 1.5;
        ">
          ${data.deadline || "Not specified"}
        </td>
      </tr>
    </table>

    <!-- Primary Action Button (Table-based CTA) -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center" style="background-color: #3aa6ee;">
          <a href="${process.env.FRONTEND_URL}/student" target="_blank" rel="noopener noreferrer"
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
            View Task Details &rarr;
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
      Please update the task status to <strong>In Progress</strong> inside your workspace once execution begins.
    </p>
  `;

  return mainLayout(html);
};
