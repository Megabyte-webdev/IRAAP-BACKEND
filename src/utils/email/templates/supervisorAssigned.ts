import { mainLayout } from "../layouts/mainLayout.js";

export const supervisorAssignedTemplate = (data: {
  studentName: string;
  supervisorName: string;
}) => {
  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="
        background-color: #eff6ff;
        color: #1d4ed8;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        display: inline-block;
      ">
        Supervisor Assigned
      </span>
    </div>

    <h2 style="
      margin: 0 0 12px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      text-align: center;
      line-height: 1.3;
    ">
      Research Supervisor Allocated
    </h2>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 24px auto;
      max-width: 440px;
      line-height: 1.6;
    ">
      Hello <strong>${data?.studentName}</strong>, a faculty supervisor has been assigned to guide your research repository progress on IRAP.
    </p>

    <div style="
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin: 24px 0;
      background-color: #ffffff;
    ">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; table-layout: fixed;">
        <tr>
          <td style="
            padding: 14px 16px;
            font-size: 11px;
            color: #64748b;
            background-color: #f8fafc;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            border-bottom: 0px none;
            text-align: left;
            width: 30%;
          ">
            Supervisor
          </td>
          <td style="
            padding: 14px 16px;
            color: #0f172a;
            font-size: 14px;
            font-weight: 600;
            line-height: 1.5;
            border-bottom: 0px none;
            text-align: left;
          ">
            ${data?.supervisorName}
          </td>
        </tr>
      </table>
    </div>

    <p style="
      color: #64748b;
      font-size: 13px;
      margin: 8px 0 0 0;
      line-height: 1.5;
      text-align: center;
    ">
      You can now set up review cycles, submit abstracts, and process revision documents with your assigned mentor.
    </p>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${process.env.FRONTEND_URL}/student" target="_blank" rel="noopener noreferrer"
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
        Open Workspace
      </a>
    </div>
  `;

  return mainLayout(html);
};
