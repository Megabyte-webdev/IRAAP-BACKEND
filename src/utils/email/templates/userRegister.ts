import { mainLayout } from "../layouts/mainLayout.js";

export const registeredTemplate = (data: {
  fullName: string;
  email: string;
  password: string;
  role: string;
  organizationName?: string;
  mustChangePassword?: boolean;
}) => {
  const frontendUrl = process.env.FRONTEND_URL || "https://iraap.com.ng";
  const html = `
    <!-- Category Label -->
    <p style="
      margin: 0 0 12px 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #3aa6ee;
    ">
      Account Created
    </p>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      Welcome to IRAAP, ${data?.fullName}
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello ${data?.fullName},
    </p>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Your account has been successfully created as a <strong>${data?.role.toLowerCase()}</strong> on the Institutional Research Archive Platform (IRAAP)${data?.organizationName ? ` for <strong>${data.organizationName}</strong>` : ""}. You can now log in using the credentials below.
    </p>

    <!-- Account Details Data Table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; border-collapse: collapse; border: 1px solid #e2e8f0;">
      <tr>
        <td style="
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
          Email
        </td>
        <td style="
          padding: 12px 16px;
          font-size: 14px;
          color: #0f172a;
          line-height: 1.5;
          border-bottom: 1px solid #e2e8f0;
          word-break: break-all;
        ">
          ${data?.email}
        </td>
      </tr>

      <tr>
        <td style="
          padding: 12px 16px;
          font-size: 12px;
          color: #64748b;
          background-color: #f8fafc;
          width: 28%;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        ">
          Password
        </td>
        <td style="
          padding: 12px 16px;
          color: #0f172a;
          font-size: 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          letter-spacing: 0.05em;
          line-height: 1.5;
          font-weight: 600;
        ">
          ${data?.password}
        </td>
      </tr>
    </table>

    <!-- Primary Action Button (Table-based CTA) -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center" style="background-color: #3aa6ee;">
          <a href="${frontendUrl}/${data?.role.toLowerCase()}" target="_blank" rel="noopener noreferrer"
            style="
              background-color: #3aa6ee;
              color: #ffffff;
              padding: 12px 28px;
              font-size: 14px;
              font-weight: 600;
              text-decoration: none;
              display: inline-block;
              border: 1px solid #3aa6ee;
            ">
            Go to Dashboard &rarr;
          </a>
        </td>
      </tr>
    </table>

    <!-- Divider Line -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px 0;">
      <tr>
        <td style="border-top: 1px solid #e2e8f0; font-size: 0; line-height: 0;">&nbsp;</td>
      </tr>
    </table>

    <p style="
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    ">
      <strong>Important:</strong> this is a temporary password. You must sign in and change it immediately on your first login.
    </p>
  `;

  return mainLayout(html);
};
