import { mainLayout } from "../layouts/mainLayout.js";

export const assignedTemplate = (data) => {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">New Task Assignment</h2>
    <p>Hello ${data.studentName},</p>
    <p>A new milestone has been added to your project. You can now view the details and begin working on the following task:</p>
    
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Task Title</td>
        </tr>
        <tr>
          <td style="font-weight: 600; color: #4f46e5; font-size: 16px;">${data.taskTitle}</td>
        </tr>
        <tr>
          <td style="padding-top: 16px; padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Deadline</td>
        </tr>
        <tr>
          <td style="font-weight: 600; color: #1e293b;">${data.deadline || "Not specified"}</td>
        </tr>
      </table>
    </div>

    <p style="color: #64748b; font-size: 14px; italic;">Note: Please ensure you mark the task as "In Progress" once you start.</p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="${process.env.DASHBOARD_URL}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">View Task Details</a>
    </div>
  `;
  return mainLayout(html);
};
