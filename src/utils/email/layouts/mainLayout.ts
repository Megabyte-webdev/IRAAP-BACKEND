export const mainLayout = (content: string) => {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IRAP Notification</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; width: 100% !important;">

  <!-- Outer Canvas Table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; width: 100% !important;">
    <tr>
      <td align="center" style="padding: 40px 10px;">

        <!-- Fixed Width Core Shell Wrapper Container -->
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; border-collapse: collapse; overflow: hidden;">

          <!-- Branding Banner -->
          <tr>
            <td align="center" style="padding: 32px 20px; background-color: #4f46e5;">
              <img src="https://iraap.com.ng/irap-logo.png" alt="IRAP Logo" width="70" style="display: block; margin-bottom: 12px; border: 0;">
              <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 0.5px; font-weight: 800;">IRAP Repository</h1>
            </td>
          </tr>

          <!-- Injected Child Component Slot Content -->
          <tr>
            <td style="padding: 36px; color: #334155; font-size: 15px; line-height: 1.6;">
              ${content}
            </td>
          </tr>

          <!-- Footer Segment -->
          <tr>
            <td style="padding: 28px 20px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 10px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-size: 11px;">Connect with IRAP</p>
              
              <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="https://www.instagram.com/irap.001" target="_blank" style="text-decoration: none;">
                      <img src="https://img.icons8.com/ios-filled/50/94a3b8/instagram-new.png" alt="Instagram" width="22" height="22" style="display: block; border: 0;">
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="https://www.tiktok.com/@irap406" target="_blank" style="text-decoration: none;">
                      <img src="https://img.icons8.com/ios-filled/50/94a3b8/tiktok.png" alt="TikTok" width="22" height="22" style="display: block; border: 0;">
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="https://www.linkedin.com/company/irapplatform" target="_blank" style="text-decoration: none;">
                      <img src="https://img.icons8.com/ios-filled/50/94a3b8/linkedin.png" alt="LinkedIn" width="22" height="22" style="display: block; border: 0;">
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 16px 0 0 0; color: #64748b;">This is an automated operational system notification.</p>
              <p style="margin: 4px 0 0 0;">&copy; ${year} Institutional Research Archive Platform. All rights reserved.</p>
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
