/** @jest-environment node */
export {};

const uploadStream = jest.fn();
const destroy = jest.fn();
const privateDownloadUrl = jest.fn(() => "https://signed.test/selfie");
const config = jest.fn();
jest.mock("cloudinary", () => ({ v2: { config, uploader: { upload_stream: uploadStream, destroy }, utils: { private_download_url: privateDownloadUrl } } }));
jest.mock("node:crypto", () => ({ randomUUID: () => "opaque-id" }));

describe("Cloudinary selfie boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "cloud";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secret";
  });
  it("uploads an opaque authenticated non-overwriting image", async () => {
    uploadStream.mockImplementation((options, callback) => {
      expect(options).toEqual({ resource_type: "image", type: "authenticated", folder: "whattheheel/selfies", public_id: "opaque-id", overwrite: false });
      return { end: () => callback(null, { secure_url: "https://cloud.test/asset", public_id: "folder/opaque-id" }) };
    });
    const { uploadSelfie } = await import("@/lib/external/cloudinary");
    await expect(uploadSelfie(Buffer.from("image"))).resolves.toEqual({ secureUrl: "https://cloud.test/asset", publicId: "folder/opaque-id" });
  });
  it("deletes authenticated assets with CDN invalidation", async () => {
    destroy.mockResolvedValue({ result: "ok" });
    const { deleteSelfie } = await import("@/lib/external/cloudinary");
    await deleteSelfie("opaque-id");
    expect(destroy).toHaveBeenCalledWith("opaque-id", { resource_type: "image", type: "authenticated", invalidate: true });
  });
  it("generates a five-minute authenticated private download URL", async () => {
    const { getPrivateSelfieUrl } = await import("@/lib/external/cloudinary");
    expect(getPrivateSelfieUrl("opaque-id", "jpeg", 1_000_000)).toBe("https://signed.test/selfie");
    expect(privateDownloadUrl).toHaveBeenCalledWith("opaque-id", "jpeg", { resource_type: "image", type: "authenticated", expires_at: 1300 });
  });
  it("fails before SDK operations when configuration is incomplete", async () => {
    delete process.env.CLOUDINARY_API_SECRET;
    const { uploadSelfie } = await import("@/lib/external/cloudinary");
    await expect(uploadSelfie(Buffer.from("image"))).rejects.toThrow("configuration is incomplete");
    expect(uploadStream).not.toHaveBeenCalled();
  });
});
