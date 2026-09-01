import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

function isImageSignature(buffer: Buffer) {
  if (buffer.length < 12) return false;
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    if (!allowed) return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image"));
    cb(null, true);
  },
});

export const uploadProfileImage = (fieldName = "image") =>
  (req: Request, res: Response, next: NextFunction) => {
    imageUpload.single(fieldName)(req, res, (error) => {
      if (error) {
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ success: false, message: "Profile image must be 5MB or smaller." });
        }
        if (error instanceof multer.MulterError && error.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({ success: false, message: "Only JPG, PNG, and WebP images are supported." });
        }
        console.error("Profile image upload middleware error:", error);
        return res.status(400).json({ success: false, message: "The profile image could not be processed." });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, message: "Please select a profile image." });
      }
      if (!isImageSignature(file.buffer)) {
        return res.status(400).json({ success: false, message: "The selected file is not a valid image." });
      }
      next();
    });
  };
