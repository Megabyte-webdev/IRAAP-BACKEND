import { mainLayout } from "../layouts/mainLayout.js";

export const taskSubmissionTemplate = (data: {
  studentName: string;
  projectName: string;
  taskTitle: string;
}) => {
  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="
        background-color: #e0f2fe;
        color: #0284c7;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      ">
        Task Completed
      </span>
    </div>

    <h2 style="
      margin: 0 0 12px 0;
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
    ">
      Well done, ${data.studentName}!
    </h2>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 12px auto;
      max-width: 440px;
      line-height: 1.6;
    ">
      You have successfully completed the task <strong>"${data.taskTitle}"</strong> under the project <strong>"${data.projectName}"</strong>.
    </p>

    <p style="
      color: #64748b;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 28px auto;
      max-width: 440px;
      line-height: 1.5;
    ">
      Your submission is now awaiting review by your supervisor. You will be notified once it has been verified.
    </p>

    <div style="text-align: center;">
      <a href="${process.env.DASHBOARD_URL}" 
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
        View Submission
      </a>
    </div>
  `;

  return mainLayout(html);
};
