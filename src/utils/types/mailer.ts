export const SENDERS = {
  system: "IRAAP System <noreply@iraap.com.ng>",
  onboarding: "IRAAP Onboarding <onboarding@iraap.com.ng>",
  admin: "IRAAP Admin <admin@iraap.com.ng>",
  support: "IRAAP Support <support@iraap.com.ng>",
} as const;

export type SenderType = keyof typeof SENDERS;
