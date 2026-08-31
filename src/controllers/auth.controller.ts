import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { refreshTokens, users } from "../database/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";

// Zod schema for validation
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(3),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(255),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const register = async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, input.email),
      columns: { id: true },
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
      });

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

    return res.status(201).json({
      success: true,
      token: accessToken,
      user,
      message: "Account created successfully.",
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: err.issues,
      });
    }

    console.error("Registration error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to create your account right now.",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user: any = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Optional: fetch supervisor name if exists
    let supervisorName = null;
    if (user.supervisorId) {
      const supervisor: any = await db.query.users.findFirst({
        where: eq(users.id, user.supervisorId),
      });
      supervisorName = supervisor?.fullName ?? null;
    }

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

    return res.json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        supervisorId: user.supervisorId,
        supervisorName,
      },
    });
  } catch (err: any) {
    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: err.issues,
      });
    }

    console.error("Login error:", err);

    // Catch all other errors
    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.IRAAPRefreshToken;

    if (!token) {
      return res.status(401).json({
        message: "Refresh token missing",
      });
    }

    const storedToken = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, token),
    });

    if (!storedToken) {
      return res.status(403).json({
        message: "Invalid refresh token",
      });
    }

    jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET!,
      async (err: any, decoded: any) => {
        if (err) {
          return res.status(403).json({
            message: "Expired refresh token",
          });
        }

        const user = await db.query.users.findFirst({
          where: eq(users.id, decoded.id),
        });

        if (!user) {
          return res.status(404).json({
            message: "User not found",
          });
        }

        const accessToken = generateAccessToken(user);

        return res.json({
          token: accessToken,
        });
      },
    );
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};
