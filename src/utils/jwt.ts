import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export const generateAccessToken = (user: any) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      supervisorId: user.supervisorId,
      fullName: user.fullName,
      email: user.email,
      profileImageUrl: user.profileImageUrl ?? null,
      organizationId: user.organizationId ?? null,
      organizationRole: user.organizationRole ?? null,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "15m",
    },
  );
};

export const generateRefreshToken = (
  userId: number,
  expiresAt: Date,
  familyId: string,
) => {
  const expiresInSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  return jwt.sign(
    {
      id: userId,
      familyId,
    },
    process.env.JWT_REFRESH_SECRET!,
    {
      expiresIn: expiresInSeconds,
      jwtid: crypto.randomUUID(),
    },
  );
};
