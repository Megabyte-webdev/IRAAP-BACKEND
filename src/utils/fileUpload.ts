import crypto from "crypto";
import cloudinary from "../config/cloudinary.js";

export async function uploadToCloudinary(fileBuffer: Buffer) {
  return new Promise<{
    url: string;
    publicId: string;
    resourceType: string;
    format?: string;
  }>((resolve, reject) => {
    const publicId = `research_projects/${crypto.randomUUID()}.pdf`;

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: publicId,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result) {
          return reject(new Error("Cloudinary returned no result"));
        }

        console.log("Cloudinary upload:", {
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
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
