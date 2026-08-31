import crypto from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export const generateOtp = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");

export const hashOtp = (challengeId: string, code: string) =>
  crypto
    .createHmac("sha256", process.env.OTP_PEPPER || process.env.JWT_SECRET || "iraap-otp")
    .update(`${challengeId}:${code}`)
    .digest("hex");

export const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
