import { mainLayout } from "../layouts/mainLayout.js";

export const organizationMemberAddedTemplate = (data: {
  fullName: string;
  organizationName: string;
  role: string;
  dashboardUrl: string;
}) => {
  const loginUrl = `${data.dashboardUrl.replace(/\/$/, "")}/login`;
  const html = `
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#3aa6ee;">Organization Access</p>
    <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;line-height:1.3;">You have been added to an organization</h2>
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">Hello ${data.fullName},</p>
    <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">Your existing IRAAP account has been connected to <strong>${data.organizationName}</strong> as a <strong>${data.role}</strong>. Your account and previous research work remain yours.</p>

    <table class="email-fluid-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border-collapse:collapse;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:12px 16px;font-size:12px;color:#64748b;background:#f8fafc;font-weight:600;width:32%;border-bottom:1px solid #e2e8f0;">Organization</td>
        <td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${data.organizationName}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:12px;color:#64748b;background:#f8fafc;font-weight:600;">Organization role</td>
        <td style="padding:12px 16px;font-size:14px;color:#0f172a;font-weight:600;">${data.role}</td>
      </tr>
    </table>

    <table class="email-button" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
      <tr><td align="center" style="background:#3aa6ee;border-radius:8px;">
        <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="background:#3aa6ee;color:#fff;padding:13px 26px;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;border:1px solid #3aa6ee;border-radius:8px;">Sign in to IRAAP &rarr;</a>
      </td></tr>
    </table>

    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Use your normal IRAAP credentials. You do not need to create a second account.</p>
  `;

  return mainLayout(html);
};
