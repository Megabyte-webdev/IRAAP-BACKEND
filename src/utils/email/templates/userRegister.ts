import { mainLayout } from "../layouts/mainLayout.js";

export const registeredTemplate = (data: {
  name: string;
  email: string;
  password: string;
  role: "STUDENT" | "SUPERVISOR";
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
      ">
        Account Created
      </span>
    </div>

    <h2 style="
      margin: 0 0 12px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      text-align: center;
    ">
      Welcome to IRAP, ${data?.fullName}
    </h2>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 24px auto;
      max-width: 420px;
      line-height: 1.6;
    ">
      Your account has been successfully created as a 
      <strong>${data?.role}</strong>. You can now log in and begin using the platform.
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
            Email
          </td>
          <td style="
            padding: 12px;
            color: #0f172a;
            font-size: 14px;
          ">
            ${data?.email}
          </td>
        </tr>

        <tr>
          <td style="
            padding: 12px;
            font-size: 12px;
            color: #64748b;
            background-color: #f8fafc;
          ">
            Temporary Password
          </td>
          <td style="
            padding: 12px;
            color: #0f172a;
            font-size: 14px;
            font-family: monospace;
            letter-spacing: 0.05em;
          ">
            ${data?.password}
          </td>
        </tr>
      </table>
    </div>

    <p style="
      color: #94a3b8;
      font-size: 13px;
      margin-top: 8px;
      line-height: 1.5;
    ">
      For security reasons, please log in and update your password immediately after your first sign-in.
    </p>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${process.env.DASHBOARD_URL}" 
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
        Go to Dashboard
      </a>
    </div>
  `;

  return mainLayout(html);
};
