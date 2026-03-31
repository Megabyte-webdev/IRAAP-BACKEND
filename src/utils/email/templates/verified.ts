import { mainLayout } from "../layouts/mainLayout.js";

export const verifiedTemplate = (data) => {
  const html = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="background-color: #ecfdf5; color: #059669; padding: 6px 16px; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Task Verified</span>
    </div>
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; text-align: center;">Great job, ${data.studentName}!</h2>
    <p>Your work on <b>"${data.taskTitle}"</b> has been reviewed and officially verified by your supervisor.</p>
    <p style="color: #64748b;">The task is now archived in the repository as a completed milestone.</p>
    
    <div style="text-align: center; margin-top: 32px;">
      <a href="${process.env.DASHBOARD_URL}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">View Progress</a>
    </div>
  `;
  return mainLayout(html);
};
