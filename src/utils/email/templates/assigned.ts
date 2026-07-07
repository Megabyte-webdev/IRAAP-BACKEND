import { mainLayout } from "../layouts/mainLayout.js";

export const assignedTemplate = (data) => {
  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="
        background-color: #eef2ff;
        color: #4338ca;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      ">
        New Task Assigned
      </span>
    </div>

    <h2 style="
      margin: 0 0 12px 0;
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
    ">
      ${data.taskTitle}
    </h2>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 20px auto;
      max-width: 440px;
      line-height: 1.6;
    ">
      Hello ${data.studentName}, a new milestone has been added to your project. You can now view the details and start working on the task.
    </p>

    <div style="
      background-color: #f8fafc;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
      border: 1px solid #e2e8f0;
    ">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            padding-bottom: 4px;
          ">
            Task Title
          </td>
        </tr>
        <tr>
          <td style="
            font-size: 16px;
            font-weight: 600;
            color: #4338ca;
            padding-bottom: 12px;
          ">
            ${data.taskTitle}
          </td>
        </tr>
        <tr>
          <td style="
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            padding-bottom: 4px;
          ">
            Deadline
          </td>
        </tr>
        <tr>
          <td style="
            font-size: 14px;
            font-weight: 500;
            color: #0f172a;
          ">
            ${data.deadline || "Not specified"}
          </td>
        </tr>
      </table>
    </div>

    <p style="
      color: #64748b;
      font-size: 13px;
      font-style: italic;
      line-height: 1.5;
      text-align: center;
      margin-bottom: 28px;
    ">
      Note: Please mark the task as "In Progress" once you start working on it.
    </p>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/student" target="_blank" rel="noopener noreferrer"
        style="
          background-color: #4338ca;
          color: #ffffff;
          padding: 12px 28px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        ">
        View Task Details
      </a>
    </div>
  `;

  return mainLayout(html);
};
