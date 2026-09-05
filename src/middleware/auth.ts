import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { users } from "../database/schema.js";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access Denied" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = verified;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

export const authorize = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tokenUser = (req as any).user;

    if (!tokenUser?.id) {
      return res.status(401).json({
        message: "Unauthorized: User not authenticated",
      });
    }

    try {
      // Never trust role/organization claims supplied in the JWT for privileged authorization.
      // The token only establishes the user identity; the database is the source of truth.
      const user = await db.query.users.findFirst({
        where: eq(users.id, Number(tokenUser.id)),
        columns: { id: true, role: true, organizationId: true },
      });

      if (!user) {
        return res.status(401).json({ message: "Session user no longer exists" });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          message: "Forbidden: Insufficient Permissions",
        });
      }

      // Replace mutable authorization claims with trusted DB values.
      (req as any).user = {
        ...tokenUser,
        id: user.id,
        role: user.role,
        organizationId: user.organizationId ?? null,
      };

      next();
    } catch (error) {
      console.error("authorize error", error);
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };
};


export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next();

  try {
    (req as any).user = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    // Public project pages remain accessible when an optional token is stale.
  }

  next();
};
