/** @jest-environment node */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { validateImage } from "@/lib/services/imageValidation";

describe("validateImage", () => {
  it.each(["jpeg", "png"] as const)("accepts a decoded 512px %s", async (format) => {
    const image = sharp({ create: { width: 512, height: 512, channels: 3, background: "white" } });
    const buffer = format === "jpeg" ? await image.jpeg().toBuffer() : await image.png().toBuffer();
    await expect(validateImage(buffer)).resolves.toMatchObject({ format, width: 512, height: 512 });
  });
  it("rejects corrupt bytes", async () => { await expect(validateImage(Buffer.from("not-image"))).rejects.toMatchObject({ code: "unreadable_image" }); });
  it("rejects decoded but unsupported formats", async () => { const buffer = await sharp({ create: { width: 512, height: 512, channels: 3, background: "white" } }).webp().toBuffer(); await expect(validateImage(buffer)).rejects.toMatchObject({ code: "unsupported_format" }); });
  it("rejects a genuine HEVC-backed HEIC with clear format guidance", async () => { const buffer = await readFile(path.join(process.cwd(), "lib/services/__tests__/fixtures/genuine-hevc.heic")); await expect(validateImage(buffer)).rejects.toMatchObject({ code: "unsupported_format", message: "Use a JPG or PNG image." }); });
  it("does not trust a browser MIME or filename", async () => { const png = await sharp({ create: { width: 512, height: 512, channels: 3, background: "white" } }).png().toBuffer(); const spoofed = new File([png], "selfie.jpg", { type: "image/jpeg" }); await expect(validateImage(spoofed)).resolves.toMatchObject({ format: "png" }); });
  it("applies EXIF orientation to effective dimensions", async () => { const buffer = await sharp({ create: { width: 600, height: 512, channels: 3, background: "white" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer(); await expect(validateImage(buffer)).resolves.toMatchObject({ width: 512, height: 600 }); });
  it("rejects a missing file", async () => { await expect(validateImage(null)).rejects.toMatchObject({ code: "missing_file" }); });
  it("rejects undersized images", async () => { const buffer = await sharp({ create: { width: 511, height: 512, channels: 3, background: "white" } }).png().toBuffer(); await expect(validateImage(buffer)).rejects.toMatchObject({ code: "image_too_small" }); });
  it("rejects files at the strict limit", async () => { await expect(validateImage(Buffer.alloc(10_000_000))).rejects.toMatchObject({ code: "file_too_large" }); });
});
