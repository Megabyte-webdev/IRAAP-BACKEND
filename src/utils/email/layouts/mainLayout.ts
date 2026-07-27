export const mainLayout = (content: string) => {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IRAAP Notification</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; width: 100% !important;">

  <!-- Outer Canvas Table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; width: 100% !important;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Core Shell Container -->
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; background-color: #ffffff; border-collapse: collapse;">

          <!-- Top Brand Primary Accent Line -->
          <tr>
            <td style="background-color: #3aa6ee; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header / Branding Banner -->
          <tr>
            <td align="left" style="padding: 32px 40px; background-color: #0f172a;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align: middle; width: 44px;">
                    <img src="https://iraap.com.ng/irap-logo.png" alt="IRAAP Logo" width="36" height="36" style="display: block; border: 0;">
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <h1 style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 700; letter-spacing: 0.3px;">
                      Institutional Research Archive Platform
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 40px; color: #334155; font-size: 15px; line-height: 1.6;">
              ${content}
            </td>
          </tr>

          <!-- Footer Segment -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: left; color: #64748b; font-size: 12px; line-height: 1.6;">
              
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding-right: 12px;">
                    <a href="https://www.linkedin.com/company/irapplatform" target="_blank" style="text-decoration: none; color: #3aa6ee; font-weight: 600; font-size: 12px;">LinkedIn</a>
                  </td>
                  <td style="padding-right: 12px; color: #cbd5e1;">&bull;</td>
                  <td style="padding-right: 12px;">
                    <a href="https://www.instagram.com/irap.001" target="_blank" style="text-decoration: none; color: #3aa6ee; font-weight: 600; font-size: 12px;">Instagram</a>
                  </td>
                  <td style="padding-right: 12px; color: #cbd5e1;">&bull;</td>
                  <td>
                    <a href="https://www.tiktok.com/@irap406" target="_blank" style="text-decoration: none; color: #3aa6ee; font-weight: 600; font-size: 12px;">TikTok</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 4px 0; color: #475569; font-weight: 500;">Automated System Notification</p>
              <p style="margin: 0; color: #94a3b8;">&copy; ${year} Institutional Research Archive Platform (IRAAP). All rights reserved.</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
};
