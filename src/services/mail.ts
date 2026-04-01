import * as nodemailer from "nodemailer";

const transporter: any = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  logger: process.env.NODE_ENV !== "production", // log only in dev
  debug: process.env.NODE_ENV !== "production",
});

export const verifyTransporter = async () => {
  try {
    await transporter.verify();
     await sendEmail(
       "irap.oou@gmail.com",
     "Test Email",
       "<p>Hello World</p>",
    );
    console.log("Mail server is ready to take our messages");
  } catch (err) {
    console.error(" Failed to verify transporter:", err);
  }
};

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
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
