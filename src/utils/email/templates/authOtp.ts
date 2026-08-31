export const authOtpTemplate = ({
  fullName,
  code,
  purpose,
}: {
  fullName?: string | null;
  code: string;
  purpose: "SIGNUP" | "LOGIN" | "PASSWORD_RESET";
}) => {
  const action =
    purpose === "SIGNUP"
      ? "verify your new IRAAP account"
      : purpose === "LOGIN"
        ? "complete your IRAAP sign in"
        : "reset your IRAAP password";

  return `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="margin-bottom:8px">IRAAP security code</h2>
    <p>Hello ${fullName || "there"},</p>
    <p>Use the code below to ${action}.</p>
    <div style="font-size:32px;letter-spacing:10px;font-weight:700;background:#f1f5f9;border-radius:12px;padding:18px;text-align:center;margin:24px 0">${code}</div>
    <p>This code expires in <strong>10 minutes</strong> and can only be used once.</p>
    <p>If you did not request this code, you can safely ignore this email and review your account security.</p>
  </div>`;
};
