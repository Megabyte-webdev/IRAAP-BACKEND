import { mainLayout } from "../layouts/mainLayout.js";

export const taskSubmissionTemplate = (data: {
  supervisorName: string;
  studentName: string;
  projectName: string;
  taskTitle: string;
  taskStatus: string;
  dashboardUrl: string;
}) => {
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
        display: inline-block;
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
      line-height: 1.3;
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
      Hello ${data.supervisorName}, <strong>${data.studentName}</strong> has submitted evidence for task review. Please verify the submission and provide feedback.
    </p>

    <div style="
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin: 24px 0;
      background-color: #ffffff;
    ">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr>
          <td class="stack-cell-label" style="
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
            Project
          </td>
          <td class="stack-cell-value" style="
            padding: 12px 16px;
            font-size: 14px;
            color: #0f172a;
            line-height: 1.5;
            border-bottom: 1px solid #e2e8f0;
          ">
            ${data.projectName}
          </td>
        </tr>

        <tr>
          <td class="stack-cell-label" style="
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
            Student
          </td>
          <td class="stack-cell-value" style="
            padding: 12px 16px;
            font-size: 14px;
            color: #0f172a;
            line-height: 1.5;
            border-bottom: 1px solid #e2e8f0;
          ">
            ${data.studentName}
          </td>
        </tr>

        <tr>
          <td class="stack-cell-label" style="
            padding: 12px 16px;
            font-size: 12px;
            color: #64748b;
            background-color: #f8fafc;
            width: 28%;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          ">
            Task
          </td>
          <td class="stack-cell-value" style="
            padding: 12px 16px;
            font-size: 14px;
            color: #0f172a;
            font-weight: 500;
            line-height: 1.5;
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
      margin: 8px 0 0 0;
      text-align: center;
    ">
      You can verify the submission, view evidence, and provide feedback directly from your dashboard.
    </p>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${data.dashboardUrl}/supervisor" 
        style="
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 26px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        ">
        Review Submission
      </a>
      </div>
  `;

  return mainLayout(html);
};
