import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // Explicit 20MB limit
    fieldSize: 25 * 1024 * 1024,
  },
});
