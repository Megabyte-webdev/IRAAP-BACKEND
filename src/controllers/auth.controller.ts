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
  email: z.string().email(),
  password: z.string().min(3),
});

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
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("IRAAPRefreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
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
