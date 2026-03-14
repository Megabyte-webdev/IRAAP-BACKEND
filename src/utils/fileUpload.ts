// src/services/upload.service.ts
import cloudinary from "../config/cloudinary.js";

export async function uploadToCloudinary(fileBuffer: Buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "research_projects",
        resource_type: "raw", // IMPORTANT: Use "raw" for PDFs to prevent transcoding
      },
      (error, result: any) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    // Directly end the stream with the buffer
    stream.end(fileBuffer);
  });
}
