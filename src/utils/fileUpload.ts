import crypto from "crypto";
import cloudinary from "../config/cloudinary.js";

export async function uploadToCloudinary(fileBuffer: Buffer) {
  return new Promise<{
    url: string;
    publicId: string;
    resourceType: string;
    format?: string;
  }>((resolve, reject) => {
    const publicId = crypto.randomUUID();

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "research_projects",
        public_id: publicId,
        resource_type: "image",
        format: "pdf",
      },
      (error, result) => {
        if (error) {
          console.error("[CLOUDINARY] Upload error:", error);
          return reject(error);
        }

        if (!result) {
          return reject(new Error("Cloudinary returned no result"));
        }

        console.log("[CLOUDINARY] Upload result:", {
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
          original_filename: result.original_filename,
          version: result.version,
          bytes: result.bytes,
        });

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
        });
      },
    );

    stream.end(fileBuffer);
  });
}
