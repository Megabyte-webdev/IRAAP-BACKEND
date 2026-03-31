import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_KEY);

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await resend.emails.send({
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
