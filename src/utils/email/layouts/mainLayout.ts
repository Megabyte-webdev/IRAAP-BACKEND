export const mainLayout = (content: any) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td align="center" style="padding: 30px; background-color: #4f46e5;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px; font-weight: 800;">IRAP REPOSITORY</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; color: #334155; line-height: 1.6; font-size: 16px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; background-color: #f8fafc; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0;">This is an automated notification from the IRAP School Portal.</p>
              <p style="margin: 4px 0 0 0;">© 2026 Institutional Research Archive</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
