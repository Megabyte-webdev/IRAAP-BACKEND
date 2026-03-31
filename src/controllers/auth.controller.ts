import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { users } from "../database/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

// Zod schema for validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        supervisorId: user.supervisorId,
        fullName: user.fullName,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" },
    );

    // Respond with token + user info
    return res.json({
      success: true,
      token,
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
