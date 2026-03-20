import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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
    res.status(400).json({ message: "Invalid Token" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    // Ensure user exists
    if (!user) {
      return res.status(401).json({
        message: "Unauthorized: User not authenticated",
      });
    }

    // Ensure role exists
    if (!user.role) {
      return res.status(400).json({
        message: "Invalid user payload: Missing role",
      });
    }

    // Role check
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        message: "Forbidden: Insufficient Permissions",
      });
    }

    // Ensure ID exists
    if (!user.userId) {
      return res.status(400).json({
        message: "Invalid user payload: Missing user ID",
      });
    }

    next();
  };
};
