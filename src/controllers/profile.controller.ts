import type { Request, Response } from "express";
import { z } from "zod";
import { db } from "../config/db.js";
import { users } from "../database/schema.js";
import { eq } from "drizzle-orm";
import cloudinary from "../config/cloudinary.js";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  matricNumber: z.string().trim().max(80).optional().or(z.literal("")),
  department: z.string().trim().max(255).optional().or(z.literal("")),
  programme: z.string().trim().max(255).optional().or(z.literal("")),
  level: z.string().trim().max(50).optional().or(z.literal("")),
  academicSession: z.string().trim().max(50).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
});

function publicProfile(user: any) {
  const completed = Boolean(
    user.profileCompletedAt ||
      (user.department && user.programme && user.level),
  );
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    supervisorId: user.supervisorId,
    emailVerifiedAt: user.emailVerifiedAt,
    profileImageUrl: user.profileImageUrl,
    phone: user.phone,
    matricNumber: user.matricNumber,
    department: user.department,
    programme: user.programme,
    level: user.level,
    academicSession: user.academicSession,
    bio: user.bio,
    profileCompletedAt: user.profileCompletedAt,
    profileComplete: completed,
    createdAt: user.createdAt,
  };
}

export async function getMyProfile(req: Request, res: Response) {
  const userId = Number((req as any).user?.id);
  if (!Number.isInteger(userId)) return res.status(401).json({ success: false, message: "Unauthorized" });

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

  return res.json({ success: true, profile: publicProfile(user) });
}

export async function updateMyProfile(req: Request, res: Response) {
  try {
    const userId = Number((req as any).user?.id);
    if (!Number.isInteger(userId)) return res.status(401).json({ success: false, message: "Unauthorized" });

    const input = profileSchema.parse(req.body);
    const profileComplete = Boolean(input.department && input.programme && input.level);

    const [updated] = await db
      .update(users)
      .set({
        fullName: input.fullName,
        phone: input.phone || null,
        matricNumber: input.matricNumber || null,
        department: input.department || null,
        programme: input.programme || null,
        level: input.level || null,
        academicSession: input.academicSession || null,
        bio: input.bio || null,
        profileCompletedAt: profileComplete ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, profile: publicProfile(updated), message: "Profile updated successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: "Please check your profile details.", errors: error.issues });
    }
    console.error("Profile update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update your profile right now." });
  }
}

export async function uploadMyProfileImage(req: Request, res: Response) {
  const userId = Number((req as any).user?.id);
  const file = req.file;
  if (!Number.isInteger(userId)) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!file) return res.status(400).json({ success: false, message: "Please select a profile image." });

  let uploaded: any = null;
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    uploaded = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "iraap_profiles",
          public_id: `user_${userId}_${Date.now()}`,
          resource_type: "image",
          overwrite: false,
        },
        (error, result) => (error ? reject(error) : resolve(result)),
      );
      stream.end(file.buffer);
    });

    const [updated] = await db
      .update(users)
      .set({
        profileImageUrl: uploaded.secure_url,
        profileImagePublicId: uploaded.public_id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) throw new Error("User not found after image upload");

    if (user.profileImagePublicId) {
      await cloudinary.uploader.destroy(user.profileImagePublicId, { resource_type: "image" }).catch((error) =>
        console.warn("[CLOUDINARY] Previous profile image cleanup failed:", error?.message),
      );
    }

    return res.json({ success: true, profile: publicProfile(updated), message: "Profile photo updated successfully." });
  } catch (error) {
    if (uploaded?.public_id) {
      await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: "image" }).catch(() => undefined);
    }
    console.error("Profile image update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update your profile photo right now." });
  }
}
