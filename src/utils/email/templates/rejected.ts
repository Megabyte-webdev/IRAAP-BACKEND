import { mainLayout } from "../layouts/mainLayout.js";

export const rejectedTemplate = (data) => {
  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="
        background-color: #fff1f2;
        color: #b91c1c;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      ">
        Revision Requested
      </span>
    </div>

    <h2 style="
      margin: 0 0 12px 0;
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
    ">
      Action Needed: "${data.taskTitle}"
    </h2>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 20px auto;
      max-width: 440px;
      line-height: 1.6;
    ">
      Hello ${data.studentName}, your supervisor has reviewed your submission and requested some adjustments.
    </p>

    <div style="
      background-color: #fff1f2;
      border-left: 4px solid #e11d48;
      padding: 16px;
      margin: 24px 0;
      border-radius: 6px;
    ">
      <p style="
        margin: 0 0 4px 0;
        font-size: 14px;
        color: #9f1239;
        font-weight: 600;
      ">Supervisor's Note:</p>
      <p style="
        margin: 0;
        font-size: 14px;
        color: #334155;
        line-height: 1.5;
      ">
        ${data.comments || "Please check the dashboard for detailed feedback."}
      </p>
    </div>

    <p style="
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
      margin-bottom: 28px;
    ">
      Once updated, submit the task again for final verification.
    </p>

    <div style="text-align: center;">
      <a href="${process.env.DASHBOARD_URL}" 
        style="
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
          padding: 12px 28px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        ">
        Return to Dashboard
      </a>
    </div>
  `;

  return mainLayout(html);
};
