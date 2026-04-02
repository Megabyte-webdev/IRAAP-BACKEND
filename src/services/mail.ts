import * as nodemailer from "nodemailer";

const transporter: any = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false, // Use false for 587; use true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // This helps with connection stability on cloud providers
    ciphers: 'SSLv3',
    rejectUnauthorized: true
  }
});

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
