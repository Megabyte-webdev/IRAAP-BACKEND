export const mainLayout = (content: string) => {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IRAAP Notification</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-gutter { padding: 18px 10px !important; }
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-header { padding: 24px 20px !important; }
      .email-body { padding: 28px 20px !important; }
      .email-footer { padding: 24px 20px !important; }
      .email-brand-title { font-size: 15px !important; line-height: 1.35 !important; }
      .email-fluid-table { width: 100% !important; }
      .email-button { width: 100% !important; }
      .email-button td { width: 100% !important; }
      .email-button a { display: block !important; box-sizing: border-box !important; width: 100% !important; text-align: center !important; }
    }
  </style>
  <!--[if mso]><style type="text/css">table { border-collapse: collapse; }</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;width:100%!important;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;width:100%!important;">
    <tr>
      <td align="center" class="email-gutter" style="padding:40px 16px;">
        <table class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fff;word-break:break-word;border-collapse:collapse;">
          <tr><td style="background:#3aa6ee;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td align="left" class="email-header" style="padding:32px 40px;background:#0f172a;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td style="vertical-align:middle;width:44px;"><img src="https://iraap.com.ng/irap-logo.png" alt="IRAAP Logo" width="36" height="36" style="display:block;border:0;max-width:36px;height:auto;"></td>
                <td style="vertical-align:middle;padding-left:12px;"><h1 class="email-brand-title" style="color:#fff;font-size:18px;margin:0;font-weight:700;letter-spacing:.3px;line-height:1.4;">Institutional Research Archive Platform</h1></td>
              </tr></table>
            </td>
          </tr>
          <tr><td class="email-body" style="padding:40px;color:#334155;font-size:15px;line-height:1.6;">${content}</td></tr>
          <tr>
            <td class="email-footer" style="padding:32px 40px;background:#f1f5f9;border-top:1px solid #e2e8f0;text-align:left;color:#64748b;font-size:12px;line-height:1.6;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr>
                <td style="padding-right:12px;"><a href="https://www.linkedin.com/company/irapplatform" target="_blank" style="text-decoration:none;color:#3aa6ee;font-weight:600;font-size:12px;">LinkedIn</a></td>
                <td style="padding-right:12px;color:#cbd5e1;">&bull;</td>
                <td style="padding-right:12px;"><a href="https://www.instagram.com/irap.001" target="_blank" style="text-decoration:none;color:#3aa6ee;font-weight:600;font-size:12px;">Instagram</a></td>
                <td style="padding-right:12px;color:#cbd5e1;">&bull;</td>
                <td><a href="https://www.tiktok.com/@irap406" target="_blank" style="text-decoration:none;color:#3aa6ee;font-weight:600;font-size:12px;">TikTok</a></td>
              </tr></table>
              <p style="margin:0 0 4px;color:#475569;font-weight:500;">Automated System Notification</p>
              <p style="margin:0;color:#94a3b8;">&copy; ${year} Institutional Research Archive Platform (IRAAP). All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
