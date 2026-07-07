import { mainLayout } from "../layouts/mainLayout.js";

export const verifiedTemplate = (data) => {
  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="
        background-color: #ecfdf5;
        color: #059669;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      ">
        Task Verified
      </span>
    </div>

    <h2 style="
      margin: 0 0 12px 0;
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
    ">
      Great job, ${data.studentName}!
    </h2>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 12px auto;
      max-width: 440px;
      line-height: 1.6;
    ">
      Your work on <strong>"${data.taskTitle}"</strong> has been reviewed and officially verified by your supervisor.
    </p>

    <p style="
      color: #64748b;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 28px auto;
      max-width: 440px;
      line-height: 1.5;
    ">
      The task is now archived in the repository as a completed milestone.
    </p>

    <div style="text-align: center;">
      <a href="${process.env.DASHBOARD_URL}/student" target="_blank" rel="noopener noreferrer"
        style="
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 28px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        ">
        View Progress
      </a>
    </div>
  `;

  return mainLayout(html);
};
