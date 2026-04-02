export const mainLayout = (content: any) => {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IRAP Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica', Arial, sans-serif;">

  <!-- Outer Table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 10px;">

        <!-- Inner Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.08);">

          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 24px 0; background-color: #4f46e5;">
              <img src="https://iraap-backend.vercel.app/irap-logo.png" alt="IRAP Logo" width="80" style="display: block; margin-bottom: 12px;">
              <h1 style="color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 1px; font-weight: 800;">IRAP Repository</h1>
            </td>
          </tr>

          <!-- Email Content -->
          <tr>
            <td style="padding: 40px; color: #334155; font-size: 16px; line-height: 1.6;">
              ${content}
            </td>
          </tr>

          <!-- Call-to-Action / Button Example (Optional) -->
          <!--
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;">
              <a href="https://irapplatform.com" target="_blank" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Portal</a>
            </td>
          </tr>
          -->

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f8fafc; text-align: center; color: #94a3b8; font-size: 12px;">

              <!-- Social Links -->
              <p style="margin: 0 0 8px 0;">Follow us on</p>
              <a href="https://www.instagram.com/irap.001" target="_blank" style="margin: 0 6px; text-decoration: none;">
                <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/instagram.svg" alt="Instagram" width="24" height="24" style="vertical-align: middle;">
              </a>
              <a href="https://www.tiktok.com/@irap406" target="_blank" style="margin: 0 6px; text-decoration: none;">
                <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tiktok.svg" alt="TikTok" width="24" height="24" style="vertical-align: middle;">
              </a>
              <a href="https://www.linkedin.com/company/irapplatform" target="_blank" style="margin: 0 6px; text-decoration: none;">
                <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg" alt="LinkedIn" width="24" height="24" style="vertical-align: middle;">
              </a>

              <!-- Legal / Info -->
              <p style="margin: 12px 0 0 0;">This is an automated notification from the IRAP School Portal.</p>
              <p style="margin: 4px 0 0 0;">© ${year} Institutional Research Archive Platform</p>
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
