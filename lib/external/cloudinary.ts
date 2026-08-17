import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

function configure() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) throw new Error("Cloudinary configuration is incomplete");
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

export interface UploadedSelfie { secureUrl: string; publicId: string }
export async function uploadSelfie(buffer: Buffer): Promise<UploadedSelfie> {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: "image", type: "authenticated", folder: "whattheheel/selfies", public_id: randomUUID(), overwrite: false }, (error, result) => {
      if (error || !result) reject(error ?? new Error("Cloudinary upload failed"));
      else resolve({ secureUrl: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}
export async function deleteSelfie(publicId: string): Promise<void> {
  configure(); await cloudinary.uploader.destroy(publicId, { resource_type: "image", type: "authenticated", invalidate: true });
}
export function getPrivateSelfieUrl(publicId: string, format: string, now = Date.now()): string {
  configure();
  return cloudinary.utils.private_download_url(publicId, format, { resource_type: "image", type: "authenticated", expires_at: Math.floor(now / 1000) + 300 });
}
