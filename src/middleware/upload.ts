import multer from "multer";
import type { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    fieldSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
    }

    cb(null, true);
  },
});

export const uploadPdf = (fieldName = "file") =>
  (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (error) => {
      if (!error) return next();

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "PDF file must be 20MB or smaller.",
          });
        }

        if (error.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: "Only PDF documents are supported.",
          });
        }
      }

      console.error("Upload middleware error:", error);
      return res.status(400).json({
        success: false,
        message: "The uploaded document could not be processed.",
      });
    });
  };
