import { Resend } from "resend";
import { SENDERS, type SenderType } from "../utils/types/mailer.js";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  senderType: SenderType = "onboarding",
) => {
  try {
    const response = await resend.emails.send({
      from: SENDERS[senderType],
      to,
      subject,
      html,
    });

    return { success: true, response };
  } catch (error) {
    console.error("RESEND ERROR:", error);
    return { success: false, error };
  }
};
