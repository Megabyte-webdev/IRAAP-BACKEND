import { mainLayout } from "../layouts/mainLayout.js";

export const rejectedTemplate = (data) => {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">Revision Requested</h2>
    <p>Hello ${data.studentName},</p>
    <p>Your supervisor has reviewed your submission for <b>"${data.taskTitle}"</b> and requested some adjustments.</p>
    
    <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #9f1239; font-weight: 600;">Supervisor's Note:</p>
      <p style="margin: 4px 0 0 0; color: #334155;">${data.comments || "Please check the dashboard for detailed feedback."}</p>
    </div>

    <p>Please update the task and re-submit it for final verification.</p>

    <div style="text-align: center; margin-top: 32px;">
      <a href="${process.env.DASHBOARD_URL}" style="border: 2px solid #e2e8f0; color: #1e293b; padding: 10px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">Return to Dashboard</a>
    </div>
  `;
  return mainLayout(html);
};
