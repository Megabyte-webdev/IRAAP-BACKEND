import { mainLayout } from "../layouts/mainLayout.js";

export const projectPublishedTemplate = (data: {
  studentName: string;
  projectName: string;
  supervisorName?: string;
  publishedAt?: string;
  dashboardUrl?: string;
}) => {
  const supervisor = data.supervisorName || "Your Supervisor";
  const redirectUrl =
    data.dashboardUrl || `${process.env.FRONTEND_URL}/student`;
  const formattedDate = data.publishedAt
    ? new Date(data.publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const html = `
    <!-- Category Label -->
    <p style="
      margin: 0 0 12px 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #16a34a;
    ">
      Official Publication
    </p>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      Project Live in Institutional Archive! 🎉
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello ${data.studentName},
    </p>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Congratulations! Your research project <strong>"${data.projectName}"</strong> has been officially published and archived in the Institutional Research Repository and Academic Archive Platform (IRAAP).
    </p>

    <!-- Callout Box -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; border-collapse: collapse;">
      <tr>
        <td style="
          background-color: #f0fdf4;
          border-left: 4px solid #22c55e;
          padding: 16px 20px;
        ">
          <p style="
            margin: 0 0 4px 0;
            font-size: 11px;
            font-weight: 700;
            color: #15803d;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          ">
            Supervising Sign-off
          </p>
          <p style="
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 600;
            color: #166534;
            line-height: 1.5;
          ">
            Verified by ${supervisor}
          </p>
          <p style="
            margin: 0;
            font-size: 12px;
            color: #15803d;
          ">
            Published Date: <strong>${formattedDate}</strong>
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 28px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Your thesis document is now permanently indexed and accessible for academic references and institutional evaluation.
    </p>

    <!-- Primary Action Button -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center" style="background-color: #3aa6ee;">
          <a href="${redirectUrl}" target="_blank" rel="noopener noreferrer"
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
            View Published Work &rarr;
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
      Thank you for your academic contribution to the IRAAP repository catalog.
    </p>
  `;

  return mainLayout(html);
};
