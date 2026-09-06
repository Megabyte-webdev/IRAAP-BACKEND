import type { Request, Response } from "express";
import crypto from "node:crypto";
import { db } from "../config/db.js";
import {
  authOtpChallenges,
  organizationMemberships,
  refreshTokens,
  users,
  notifications,
} from "../database/schema.js";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
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

const getOrganizationAccess = async (userId: number) => {
  const membership = await db.query.organizationMemberships.findFirst({
    where: eq(organizationMemberships.userId, userId),
    orderBy: [desc(organizationMemberships.createdAt)],
    columns: { organizationId: true, role: true },
  });
  return {
    organizationId: membership?.organizationId ?? null,
    organizationRole: membership?.role ?? null,
  };
};

const REFRESH_IDLE_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_MAX_SESSION_MS = 90 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_NAME = "IRAAPRefreshToken";

const hashRefreshToken = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const getRefreshCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as const)
      : ("lax" as const),
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: "/",
  maxAge,
});

const setRefreshCookie = (res: Response, token: string, maxAge: number) =>
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions(maxAge));

const issueSession = async (res: Response, user: any) => {
  const now = Date.now();
  const sessionExpiresAt = new Date(now + REFRESH_MAX_SESSION_MS);
  const refreshExpiresAt = new Date(
    Math.min(now + REFRESH_IDLE_MS, sessionExpiresAt.getTime()),
  );
  const familyId = crypto.randomUUID().replace(/-/g, "");
  const refreshToken = generateRefreshToken(
    user.id,
    sessionExpiresAt,
    familyId,
  );

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    familyId,
    expiresAt: refreshExpiresAt,
    sessionExpiresAt,
    lastUsedAt: new Date(now),
  });

  setRefreshCookie(
    res,
    refreshToken,
    Math.max(1000, refreshExpiresAt.getTime() - now),
  );

  return { accessToken: generateAccessToken(user) };
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

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(128),
});

const resetPasswordSchema = z.object({
  challengeId: z.string().min(20).max(64),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  password: z.string().min(8).max(128),
});

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const email = z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .parse(req.body?.email);
    const user: any = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    // Do not reveal whether an account exists.
    if (!user) {
      return res.json({
        success: true,
        message: "If an account exists, a verification code has been sent.",
      });
    }
    const challengeId = await createOtpChallenge({
      user,
      email,
      purpose: "PASSWORD_RESET",
    });
    return res.json({
      success: true,
      challengeId,
      email,
      purpose: "PASSWORD_RESET",
      message: "A password reset code has been sent.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid email address." });
    console.error("Forgot password error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Unable to start password recovery right now.",
      });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { challengeId, code, password } = resetPasswordSchema.parse(req.body);
    const challenge: any = await db.query.authOtpChallenges.findFirst({
      where: and(
        eq(authOtpChallenges.id, challengeId),
        eq(authOtpChallenges.purpose, "PASSWORD_RESET"),
        isNull(authOtpChallenges.consumedAt),
      ),
    });
    if (!challenge || challenge.expiresAt.getTime() <= Date.now())
      return res
        .status(400)
        .json({
          success: false,
          message: "This verification code is invalid or expired.",
        });
    if (challenge.attempts >= OTP_MAX_ATTEMPTS)
      return res
        .status(429)
        .json({
          success: false,
          message: "Too many incorrect attempts. Request a new code.",
        });
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
    if (!challenge.userId)
      return res
        .status(400)
        .json({ success: false, message: "Verification session is invalid." });
    const passwordHash = await bcrypt.hash(password, 12);
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          password: passwordHash,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, challenge.userId));
      await tx
        .update(authOtpChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(authOtpChallenges.id, challenge.id));
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, challenge.userId));
    });
    return res.json({ success: true, message: "Password reset successfully." });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid password reset request.",
          errors: err.issues,
        });
    console.error("Reset password error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Unable to reset your password right now.",
      });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id);
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    const { currentPassword, newPassword } = passwordChangeSchema.parse(
      req.body,
    );
    const user: any = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    if (
      currentPassword &&
      !(await bcrypt.compare(currentPassword, user.password))
    )
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect." });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          password: passwordHash,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      await tx
        .insert(notifications)
        .values({
          userId,
          type: "SECURITY_PASSWORD_CHANGED",
          title: "Password changed",
          message: "Your IRAAP password was changed successfully.",
          link: "/profile",
        });
    });
    return res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({
          success: false,
          message: err.issues[0]?.message || "Invalid password.",
        });
    console.error("Change password error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Unable to change your password right now.",
      });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body);
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existingUser) {
      return res.status(409).json({
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
        mustChangePassword: users.mustChangePassword,
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
      mustChangePassword: Boolean(user.mustChangePassword),
      message: "We sent a verification code to your email.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: err.issues,
      });
    console.error("Registration error:", err);
    return res.status(500).json({
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
      mustChangePassword: Boolean(user.mustChangePassword),
      message: "We sent a verification code to your email.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res.status(400).json({
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
      return res.status(400).json({
        success: false,
        message: "This verification code is invalid or expired.",
      });
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
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

    const organizationAccess = await getOrganizationAccess(user.id);
    const { accessToken } = await issueSession(res, user);
    return res.json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organizationId: organizationAccess.organizationId,
        organizationRole: organizationAccess.organizationRole,
        supervisorId: user.supervisorId,
        profileImageUrl: user.profileImageUrl ?? null,
        profileComplete: Boolean(
          user.profileCompletedAt ||
          (user.department && user.programme && user.level),
        ),
        mustChangePassword: Boolean(user.mustChangePassword),
        supervisorName: supervisor?.fullName ?? null,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        success: false,
        message: "Enter the 6-digit verification code.",
      });
    console.error("OTP verification error:", err);
    return res.status(500).json({
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
      return res.status(400).json({
        success: false,
        message: "This verification session has expired. Start again.",
      });
    }

    if (Date.now() - challenge.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
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
    return res.status(500).json({
      success: false,
      message: "Unable to resend the verification code.",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      const tokenHash = hashRefreshToken(token);
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }
  } finally {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return res.json({ success: true });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Refresh token missing",
      code: "REFRESH_MISSING",
    });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
  } catch (error: any) {
    console.warn(
      "Refresh token cryptographic validation failed:",
      error?.message || error,
    );
    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return res.status(401).json({
      success: false,
      message: "Refresh session is invalid or expired",
      code:
        error?.name === "TokenExpiredError"
          ? "REFRESH_EXPIRED"
          : "REFRESH_INVALID",
    });
  }

  if (
    !decoded?.id ||
    !decoded?.familyId ||
    typeof decoded.familyId !== "string"
  ) {
    return res.status(401).json({
      success: false,
      message: "Refresh session is invalid",
      code: "REFRESH_INVALID",
    });
  }

  const tokenHash = hashRefreshToken(token);
  const now = new Date();

  try {
    // Advisory-lock the session family so two simultaneous refresh requests
    // cannot both rotate the same token at the same time.
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${decoded.familyId}, 0))`,
      );

      const stored = await tx.query.refreshTokens.findFirst({
        where: eq(refreshTokens.tokenHash, tokenHash),
      });

      if (!stored) {
        return {
          ok: false as const,
          status: 401,
          code: "REFRESH_INVALID",
          message: "Refresh session is invalid",
        };
      }

      if (stored.familyId !== decoded.familyId) {
        return {
          ok: false as const,
          status: 401,
          code: "REFRESH_INVALID",
          message: "Refresh session is invalid",
        };
      }

      if (stored.revokedAt) {
        // A revoked refresh token being presented again is a strong signal of
        // token theft/reuse. Revoke every token in the family immediately.
        await tx
          .update(refreshTokens)
          .set({ revokedAt: now })
          .where(eq(refreshTokens.familyId, stored.familyId));
        return {
          ok: false as const,
          status: 401,
          code: "REFRESH_REUSE_DETECTED",
          message: "Refresh session has been revoked. Please sign in again.",
        };
      }

      if (
        stored.expiresAt.getTime() <= now.getTime() ||
        stored.sessionExpiresAt.getTime() <= now.getTime()
      ) {
        await tx
          .update(refreshTokens)
          .set({ revokedAt: now })
          .where(eq(refreshTokens.id, stored.id));
        return {
          ok: false as const,
          status: 401,
          code: "REFRESH_EXPIRED",
          message: "Refresh session expired. Please sign in again.",
        };
      }

      const user: any = await tx.query.users.findFirst({
        where: eq(users.id, Number(decoded.id)),
      });
      if (!user) {
        await tx
          .update(refreshTokens)
          .set({ revokedAt: now })
          .where(eq(refreshTokens.familyId, stored.familyId));
        return {
          ok: false as const,
          status: 401,
          code: "REFRESH_USER_INVALID",
          message: "Session is invalid",
        };
      }

      const nextExpiresAt = new Date(
        Math.min(
          now.getTime() + REFRESH_IDLE_MS,
          stored.sessionExpiresAt.getTime(),
        ),
      );
      const nextRefreshToken = generateRefreshToken(
        user.id,
        stored.sessionExpiresAt,
        stored.familyId,
      );
      const nextTokenHash = hashRefreshToken(nextRefreshToken);

      await tx
        .update(refreshTokens)
        .set({
          revokedAt: now,
          replacedByTokenHash: nextTokenHash,
          lastUsedAt: now,
        })
        .where(eq(refreshTokens.id, stored.id));

      await tx.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: nextTokenHash,
        familyId: stored.familyId,
        expiresAt: nextExpiresAt,
        sessionExpiresAt: stored.sessionExpiresAt,
        lastUsedAt: now,
      });

      return {
        ok: true as const,
        accessToken: generateAccessToken(user),
        refreshToken: nextRefreshToken,
        cookieMaxAge: nextExpiresAt.getTime() - now.getTime(),
        user,
      };
    });

    if (!result.ok) {
      res.clearCookie(REFRESH_COOKIE_NAME, {
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
      return res.status(result.status).json({
        success: false,
        message: result.message,
        code: result.code,
      });
    }

    setRefreshCookie(res, result.refreshToken, result.cookieMaxAge);
    const organizationAccess = await getOrganizationAccess(result.user.id);

    return res.json({
      success: true,
      token: result.accessToken,
      user: {
        id: result.user.id,
        fullName: result.user.fullName,
        email: result.user.email,
        role: result.user.role,
        organizationId: organizationAccess.organizationId,
        organizationRole: organizationAccess.organizationRole,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to refresh your session right now. Please try again.",
      code: "REFRESH_SERVER_ERROR",
    });
  }
};
