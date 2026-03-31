import { mainLayout } from "../layouts/mainLayout.js";

export const submittedTemplate = (data) => {
  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="
        background-color: #f1f5f9;
        color: #334155;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      ">
        Action Required
      </span>
    </div>

    <h2 style="
      margin: 0 0 12px 0;
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
    ">
      Task Awaiting Review
    </h2>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 24px auto;
      max-width: 440px;
      line-height: 1.6;
    ">
      Hello ${data.supervisorName}, a student has submitted a task for your verification.
      Please review the submission and take the appropriate action.
    </p>

    <div style="
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin: 24px 0;
    ">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="
            padding: 12px;
            font-size: 12px;
            color: #64748b;
            background-color: #f8fafc;
            width: 35%;
          ">
            Student
          </td>
          <td style="
            padding: 12px;
            font-size: 14px;
            color: #0f172a;
          ">
            ${data.studentName}
          </td>
        </tr>

        <tr>
          <td style="
            padding: 12px;
            font-size: 12px;
            color: #64748b;
            background-color: #f8fafc;
          ">
            Task
          </td>
          <td style="
            padding: 12px;
            font-size: 14px;
            color: #0f172a;
            font-weight: 500;
          ">
            ${data.taskTitle}
          </td>
        </tr>
      </table>
    </div>

    <p style="
      color: #64748b;
      font-size: 13px;
      line-height: 1.5;
      margin-top: 8px;
      text-align: center;
    ">
      You can verify the submission or request revisions directly from your dashboard.
    </p>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${process.env.DASHBOARD_URL}/supervisor" 
        style="
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 26px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        ">
        Review Submission
      </a>
    </div>
  `;

  return mainLayout(html);
};
