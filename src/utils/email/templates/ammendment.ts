import { mainLayout } from "../layouts/mainLayout.js";

export const amendmentTemplate = (data) => {
  const html = `
    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px;">Project Feedback & Guidance</h2>
    <p>Hello ${data.studentName},</p>
    <p>Your supervisor, <b>${data.supervisorName}</b>, has reviewed your recent submission for <b>"${data.projectName}"</b>.</p>
    
    <p>To help you move this project toward final approval, the following guidance has been provided:</p>

    <div style="background-color: #f0f7ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 11px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">Review Summary</p>
      <p style="margin: 10px 0 0 0; color: #1e3a8a; font-size: 15px; line-height: 1.6; font-style: italic;">
        "${data.summary}"
      </p>
    </div>

    <p>There are <b>${data.taskCount} specific amendment tasks</b> waiting for you on your dashboard. Please address these points and resubmit for final verification.</p>

    <div style="text-align: center; margin-top: 35px;">
      <a href="${data.dashboardUrl}" style="background-color: #1e293b; color: #ffffff; padding: 14px 30px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block;">View Amendments</a>
    </div>

    <p style="margin-top: 30px; font-size: 13px; color: #64748b; text-align: center;">
      Questions? Reach out to your supervisor via the portal comments.
    </p>
  `;
  return mainLayout(html);
};
