import type { Request, Response } from "express";
import { db } from "../config/db.js";
import { users } from "../database/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  //add validation using zod and also add supervisor name using the supervisorId in the user table and return it in the response
  const user: any = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) throw new Error("User not found");

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error("Invalid credentials");

  const token = jwt.sign(
    { userId: user.id, role: user.role, supervisorId: user.supervisor_id },
    process.env.JWT_SECRET!,
    {
      expiresIn: "1d",
    },
  );

  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      supervisorId: user.supervisorId,
      role: user.role,
    },
  });
};
