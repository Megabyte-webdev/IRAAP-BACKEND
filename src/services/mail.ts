import { Resend } from "resend";
const resend = new Resend("re_f1nXWkCT_DWngaeWEH6mvzu4CQ74B6Nkp");

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await resend.emails.send({
      from: `"OOU IRAP Portal" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Message sent: %s", to);
    return { success: true };
  } catch (error) {
    console.error("Email Error:", error);
    return { success: false, error };
  }
};
