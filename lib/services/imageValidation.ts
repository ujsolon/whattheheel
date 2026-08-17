import sharp from "sharp";

export type ImageFormat = "jpeg" | "png";
export interface ValidatedImage { buffer: Buffer; format: ImageFormat; width: number; height: number; bytes: number }

export class ImageValidationError extends Error {
  constructor(public readonly code: "missing_file" | "unsupported_format" | "unreadable_image" | "image_too_small" | "file_too_large", message: string) {
    super(message); this.name = "ImageValidationError";
  }
}

function isHeifContainer(buffer: Buffer): boolean {
  if (buffer.byteLength < 12 || buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const brands = buffer.toString("ascii", 8, Math.min(buffer.byteLength, 32));
  return /heic|heix|hevc|hevx|heim|heis|mif1|msf1/.test(brands);
}

export async function validateImage(input: File | Buffer | Uint8Array | null | undefined): Promise<ValidatedImage> {
  if (!input) throw new ImageValidationError("missing_file", "Choose a selfie to upload.");
  const buffer = Buffer.isBuffer(input) ? input : input instanceof File ? Buffer.from(await input.arrayBuffer()) : Buffer.from(input);
  if (isHeifContainer(buffer)) throw new ImageValidationError("unsupported_format", "Use a JPG or PNG image.");
  if (buffer.byteLength >= 10_000_000) throw new ImageValidationError("file_too_large", "That image is too large (max 10MB) — please choose a smaller file.");
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try { metadata = await sharp(buffer, { limitInputPixels: 40_000_000, pages: 2 }).metadata(); }
  catch { throw new ImageValidationError("unreadable_image", "We couldn't read that image — please choose a different file."); }
  if (!metadata.format || !(["jpeg", "png"] as string[]).includes(metadata.format)) throw new ImageValidationError("unsupported_format", "Use a JPG or PNG image.");
  if ((metadata.pages ?? 1) > 1) throw new ImageValidationError("unsupported_format", "Use a JPG or PNG image.");
  const rotated = (metadata.orientation ?? 1) >= 5 && (metadata.orientation ?? 1) <= 8;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;
  if (!width || !height) throw new ImageValidationError("unreadable_image", "We couldn't read that image — please choose a different file.");
  if (width * height > 40_000_000) throw new ImageValidationError("unreadable_image", "We couldn't read that image — please choose a different file.");
  if (width < 512 || height < 512) throw new ImageValidationError("image_too_small", "Use an image that is at least 512 × 512 pixels.");
  try { await sharp(buffer, { limitInputPixels: 40_000_000 }).rotate().raw().toBuffer(); }
  catch { throw new ImageValidationError("unreadable_image", "We couldn't read that image — please choose a different file."); }
  return { buffer, format: metadata.format as ImageFormat, width, height, bytes: buffer.byteLength };
}
