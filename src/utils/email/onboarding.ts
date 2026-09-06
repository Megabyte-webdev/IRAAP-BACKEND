import { sendEmail } from "../../services/mail.js";
import { registeredTemplate } from "./templates/userRegister.js";

export async function sendOnboardingEmail({
  email,
  fullName,
  password,
  role,
  organizationName,
}: {
  email: string;
  fullName: string;
  password: string;
  role: string;
  organizationName?: string;
}) {
  return sendEmail(
    email,
    `[IRAAP] Welcome ${fullName}`,
    registeredTemplate({
      fullName,
      password,
      role,
      email,
      organizationName,
      dashboardUrl: "https://iraap.com.ng",
      mustChangePassword: true,
    } as any),
    "onboarding",
  );
}
