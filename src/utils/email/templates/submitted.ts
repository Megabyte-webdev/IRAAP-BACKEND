import { mainLayout } from "../layouts/mainLayout.js";

export const submittedTemplate = (data) => {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">Action Required: Task Review</h2>
    <p>Hello Prof. ${data.supervisorName},</p>
    <p>A student has completed a task and it is now awaiting your official verification.</p>
    
    <table width="100%" style="margin: 24px 0; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="padding: 12px; background-color: #f8fafc; font-size: 12px; font-weight: 700; color: #64748b; width: 30%;">STUDENT</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${data.studentName}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f8fafc; font-size: 12px; font-weight: 700; color: #64748b;">TASK</td>
        <td style="padding: 12px; color: #4f46e5; font-weight: 600;">${data.taskTitle}</td>
      </tr>
    </table>

    <p>Please review the submission in the IRAP portal to either <b>Verify</b> the work or <b>Request Revisions</b>.</p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="${process.env.DASHBOARD_URL}/supervisor" style="background-color: #1e293b; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">Open Review Portal</a>
    </div>
  `;
  return mainLayout(html);
};
