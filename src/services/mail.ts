import * as nodemailer from "nodemailer";

const transporter: any = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false, 
  // CRITICAL: Force IPv4 to prevent ENETUNREACH on IPv6 addresses
  family: 4, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // Remove 'SSLv3' as it is deprecated and can cause connection resets
    // 'minVersion' ensures a modern, secure connection
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  // Add timeouts to prevent the process from hanging if the network is slow
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
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
