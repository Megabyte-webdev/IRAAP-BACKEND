import { mainLayout } from "../layouts/mainLayout.js";

export const supervisorAllocationTemplate = (data: {
  supervisorName: string;
  students: string[];
}) => {
  const studentRows = data.students
    .map(
      (student) => `
      <tr>
        <td style="
          padding: 12px 16px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 500;
          border-bottom: 1px solid #f1f5f9;
          text-align: left;
        ">
          ${student}
        </td>
      </tr>
    `,
    )
    .join("");

  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="
        background-color: #f0fdf4;
        color: #16a34a;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        display: inline-block;
      ">
        Allocation Update
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
      New Students Assigned
    </h2>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 24px auto;
      max-width: 440px;
      line-height: 1.6;
    ">
      Hello Prof/Dr. <strong>${data?.supervisorName}</strong>, the academic administration has assigned the following student research profiles to your review roster on IRAP.
    </p>

    <div style="
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin: 24px 0;
      background-color: #ffffff;
    ">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; table-layout: fixed;">
        <thead>
          <tr>
            <th style="
              padding: 12px 16px;
              font-size: 11px;
              color: #64748b;
              background-color: #f8fafc;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              border-bottom: 1px solid #e2e8f0;
              text-align: left;
            ">
              Assigned Researchers (${data.students.length})
            </th>
          </tr>
        </thead>
        <tbody>
          ${studentRows}
        </tbody>
      </table>
    </div>

    <p style="
      color: #64748b;
      font-size: 13px;
      margin: 8px 0 0 0;
      line-height: 1.5;
      text-align: center;
    ">
      You can now track their proposal statuses, review pending abstract artifacts, and manage versioned draft cycles.
    </p>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${process.env.FRONTEND_URL}/supervisor" target="_blank" rel="noopener noreferrer"
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
        Review Roster
      </a>
    </div>
  `;

  return mainLayout(html);
};
