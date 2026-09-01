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
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "15m",
    },
  );
};

export const generateRefreshToken = (userId: number) => {
  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_REFRESH_SECRET!,
    {
      expiresIn: "30d",
    },
  );
};
