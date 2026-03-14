import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { users } from "../database/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // 1. Find user in DB
  const user: any = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // 2. Validate password
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // 3. Generate JWT (The "Passport")
  const token = jwt.sign(
    { id: user.id, role: user.role }, // Payload
    process.env.JWT_SECRET!, // Secret key
    { expiresIn: "8h" }, // Session duration
  );

  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
};
