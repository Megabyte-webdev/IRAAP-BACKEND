import { Resend } from "resend";
import { SENDERS, type SenderType } from "../utils/types/mailer.js";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  sender: SenderType = "onboarding",
) => {
  try {
    const response = await resend.emails.send({
      from: SENDERS[sender],
      to,
      subject,
      html,
    });

    console.log("RESEND RESPONSE:", JSON.stringify(response, null, 2));

    return { success: true, response };
  } catch (error) {
    console.error("RESEND ERROR:", error);
    return { success: false, error };
  }
};
