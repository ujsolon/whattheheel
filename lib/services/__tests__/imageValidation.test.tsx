/** @jest-environment node */
import sharp from "sharp";
import { ImageValidationError, validateImage } from "@/lib/services/imageValidation";

describe("validateImage", () => {
  it.each(["jpeg", "png"] as const)("accepts a decoded 512px %s", async (format) => {
    const image = sharp({ create: { width: 512, height: 512, channels: 3, background: "white" } });
    const buffer = format === "jpeg" ? await image.jpeg().toBuffer() : await image.png().toBuffer();
    await expect(validateImage(buffer)).resolves.toMatchObject({ format, width: 512, height: 512 });
  });
  it("rejects corrupt bytes", async () => { await expect(validateImage(Buffer.from("not-image"))).rejects.toMatchObject({ code: "unreadable_image" }); });
  it("rejects undersized images", async () => { const buffer = await sharp({ create: { width: 511, height: 512, channels: 3, background: "white" } }).png().toBuffer(); await expect(validateImage(buffer)).rejects.toMatchObject({ code: "image_too_small" }); });
  it("rejects files at the strict limit", async () => { await expect(validateImage(Buffer.alloc(10_000_000))).rejects.toEqual(expect.objectContaining<ImageValidationError>({ code: "file_too_large" })); });
});
