import type { Request, Response } from "express";
import crypto from "node:crypto";
import { db } from "../config/db.js";
import { authOtpChallenges, refreshTokens, users } from "../database/schema.js";
import { and, desc, eq, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  generateOtp,
  hashOtp,
  safeEqual,
} from "../utils/otp.js";
import { sendEmail } from "../services/mail.js";
import { authOtpTemplate } from "../utils/email/templates/authOtp.js";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(3),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

const verifySchema = z.object({
  challengeId: z.string().min(20).max(64),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

const resendSchema = z.object({
  challengeId: z.string().min(20).max(64),
});

const hash = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const issueSession = async (res: Response, user: any) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  res.cookie("IRAAPRefreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return { accessToken };
};

const createOtpChallenge = async ({
  user,
  email,
  purpose,
  challengeId,
}: {
  user?: any;
  email: string;
  purpose: "SIGNUP" | "LOGIN" | "PASSWORD_RESET";
  challengeId?: string;
}) => {
  const id = challengeId || crypto.randomUUID().replace(/-/g, "");
  const code = generateOtp();
  const now = new Date();

  await db.insert(authOtpChallenges).values({
    id,
    userId: user?.id ?? null,
    email,
    purpose,
    codeHash: hashOtp(id, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    lastSentAt: now,
  });

  const result = await sendEmail(
    email,
    purpose === "LOGIN"
      ? "Your IRAAP sign-in code"
      : purpose === "SIGNUP"
        ? "Verify your IRAAP account"
        : "Your IRAAP password reset code",
    authOtpTemplate({ fullName: user?.fullName, code, purpose }),
  );

  if (!result.success) {
    await db.delete(authOtpChallenges).where(eq(authOtpChallenges.id, id));
    throw new Error("Unable to send verification code right now.");
  }

  return id;
};

export const register = async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body);
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      return res
        .status(409)
        .json({
          success: false,
          message: "An account with this email already exists.",
        });
    }

    const password = await bcrypt.hash(input.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        fullName: input.fullName,
        email: input.email,
        password,
        role: "STUDENT",
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        supervisorId: users.supervisorId,
      });

    const challengeId = await createOtpChallenge({
      user,
      email: user.email,
      purpose: "SIGNUP",
    });

    return res.status(201).json({
      success: true,
      requiresOtp: true,
      purpose: "SIGNUP",
      challengeId,
      email: user.email,
      message: "We sent a verification code to your email.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: err.issues,
        });
    console.error("Registration error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Unable to create your account right now.",
      });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);
    const user: any = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const challengeId = await createOtpChallenge({
      user,
      email: user.email,
      purpose: "LOGIN",
    });

    return res.json({
      success: true,
      requiresOtp: true,
      purpose: "LOGIN",
      challengeId,
      email: user.email,
      message: "We sent a verification code to your email.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: err.issues,
        });
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Unable to sign you in right now." });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { challengeId, code } = verifySchema.parse(req.body);
    const challenge: any = await db.query.authOtpChallenges.findFirst({
      where: and(
        eq(authOtpChallenges.id, challengeId),
        isNull(authOtpChallenges.consumedAt),
      ),
    });

    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      return res
        .status(400)
        .json({
          success: false,
          message: "This verification code is invalid or expired.",
        });
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      return res
        .status(429)
        .json({
          success: false,
          message: "Too many incorrect attempts. Request a new code.",
        });
    }

    const valid = safeEqual(hashOtp(challenge.id, code), challenge.codeHash);
    if (!valid) {
      await db
        .update(authOtpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(authOtpChallenges.id, challenge.id));
      return res
        .status(400)
        .json({ success: false, message: "Incorrect verification code." });
    }

    const [updated] = await db
      .update(authOtpChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(authOtpChallenges.id, challenge.id))
      .returning({
        userId: authOtpChallenges.userId,
        email: authOtpChallenges.email,
        purpose: authOtpChallenges.purpose,
      });

    const userId = updated.userId;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "Verification session is invalid." });

    const user: any = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    if (updated.purpose === "SIGNUP" || !user.emailVerifiedAt) {
      await db
        .update(users)
        .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const supervisor = user.supervisorId
      ? await db.query.users.findFirst({
          where: eq(users.id, user.supervisorId),
          columns: { fullName: true },
        })
      : null;

    const { accessToken } = await issueSession(res, user);
    return res.json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        supervisorId: user.supervisorId,
        supervisorName: supervisor?.fullName ?? null,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({
          success: false,
          message: "Enter the 6-digit verification code.",
        });
    console.error("OTP verification error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Unable to verify the code right now.",
      });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { challengeId } = resendSchema.parse(req.body);
    const challenge: any = await db.query.authOtpChallenges.findFirst({
      where: and(
        eq(authOtpChallenges.id, challengeId),
        isNull(authOtpChallenges.consumedAt),
      ),
      orderBy: [desc(authOtpChallenges.createdAt)],
    });

    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      return res
        .status(400)
        .json({
          success: false,
          message: "This verification session has expired. Start again.",
        });
    }

    if (Date.now() - challenge.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res
        .status(429)
        .json({
          success: false,
          message: "Please wait before requesting another code.",
        });
    }

    const user = challenge.userId
      ? await db.query.users.findFirst({
          where: eq(users.id, challenge.userId),
        })
      : null;
    const nextId = await createOtpChallenge({
      user,
      email: challenge.email,
      purpose: challenge.purpose,
    });

    await db
      .update(authOtpChallenges)
      .set({ consumedAt: new Date() })
      .where(eq(authOtpChallenges.id, challenge.id));

    return res.json({
      success: true,
      challengeId: nextId,
      email: challenge.email,
      purpose: challenge.purpose,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification request." });
    console.error("OTP resend error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Unable to resend the verification code.",
      });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.IRAAPRefreshToken;
    if (token)
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  } finally {
    res.clearCookie("IRAAPRefreshToken", {
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return res.json({ success: true });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.IRAAPRefreshToken;
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Refresh token missing" });

    const stored = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, token),
    });
    if (!stored || stored.expiresAt.getTime() <= Date.now()) {
      return res
        .status(401)
        .json({ success: false, message: "Refresh session expired" });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
    const user: any = await db.query.users.findFirst({
      where: eq(users.id, decoded.id),
    });
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Session is invalid" });

    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    const { accessToken } = await issueSession(res, user);
    return res.json({ success: true, token: accessToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res
      .status(401)
      .json({ success: false, message: "Session is invalid or expired" });
  }
};
