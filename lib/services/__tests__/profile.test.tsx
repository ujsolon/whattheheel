/** @jest-environment node */
import { findProfile, removePendingCleanup, replaceProfile } from "@/lib/data/userProfiles";
import { deleteSelfie, getPrivateSelfieUrl, uploadSelfie } from "@/lib/external/cloudinary";
import { requireAuthenticatedUser } from "@/lib/services/auth";
import { validateImage } from "@/lib/services/imageValidation";
import { getMyProfile, ProfileConflictError, uploadMySelfie } from "@/lib/services/profile";

jest.mock("@/lib/data/userProfiles", () => ({ findProfile: jest.fn(), removePendingCleanup: jest.fn(), replaceProfile: jest.fn() }));
jest.mock("@/lib/external/cloudinary", () => ({ deleteSelfie: jest.fn(), getPrivateSelfieUrl: jest.fn(), uploadSelfie: jest.fn() }));
jest.mock("@/lib/services/auth", () => ({ requireAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/services/imageValidation", () => ({ validateImage: jest.fn() }));

const user = { id: "user-1", email: "user@example.com" };
const image = { buffer: Buffer.from("pixels"), format: "jpeg" as const, width: 512, height: 512, bytes: 6 };
const profile = { userId: user.id, selfieUrl: "stored", selfiePublicId: "new-id", assetVersion: 1, width: 512, height: 512, format: "jpeg" as const, bytes: 6, pendingCleanupPublicIds: [], createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-02") };

describe("profile service", () => {
  beforeEach(() => {
    jest.clearAllMocks(); jest.useRealTimers();
    jest.mocked(requireAuthenticatedUser).mockResolvedValue(user);
    jest.mocked(validateImage).mockResolvedValue(image);
    jest.mocked(findProfile).mockResolvedValue(null);
    jest.mocked(uploadSelfie).mockResolvedValue({ secureUrl: "stored", publicId: "new-id" });
    jest.mocked(replaceProfile).mockResolvedValue(profile);
    jest.mocked(deleteSelfie).mockResolvedValue();
    jest.mocked(getPrivateSelfieUrl).mockReturnValue("https://signed.test/selfie");
  });
  it("derives ownership, validates, uploads, then persists and returns only the public DTO", async () => {
    const result = await uploadMySelfie(new File(["x"], "selfie.jpg"));
    expect(requireAuthenticatedUser).toHaveBeenCalledTimes(1);
    expect(jest.mocked(validateImage).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(uploadSelfie).mock.invocationCallOrder[0]);
    expect(jest.mocked(uploadSelfie).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(replaceProfile).mock.invocationCallOrder[0]);
    expect(replaceProfile).toHaveBeenCalledWith(user.id, null, expect.objectContaining({ userId: user.id, selfiePublicId: "new-id" }));
    expect(result).toEqual({ email: user.email, selfieUrl: "https://signed.test/selfie", updatedAt: profile.updatedAt.toISOString(), gender: null });
    expect(result).not.toHaveProperty("selfiePublicId");
  });
  it("stops before side effects when validation rejects", async () => {
    jest.mocked(validateImage).mockRejectedValue(new Error("invalid"));
    await expect(uploadMySelfie(new File(["x"], "bad.heic"))).rejects.toThrow("invalid");
    expect(uploadSelfie).not.toHaveBeenCalled(); expect(replaceProfile).not.toHaveBeenCalled();
  });
  it("compensates the new asset and reports a CAS conflict", async () => {
    jest.mocked(replaceProfile).mockResolvedValue(null);
    await expect(uploadMySelfie(new File(["x"], "selfie.jpg"))).rejects.toBeInstanceOf(ProfileConflictError);
    expect(deleteSelfie).toHaveBeenCalledWith("new-id");
  });
  it("retries and records sanitized reconciliation details after compensation exhaustion", async () => {
    jest.useFakeTimers(); jest.mocked(replaceProfile).mockRejectedValue(new Error("mongo down")); jest.mocked(deleteSelfie).mockRejectedValue(new Error("secret URL"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const promise = uploadMySelfie(new File(["x"], "selfie.jpg"));
    const rejection = expect(promise).rejects.toThrow("mongo down");
    await jest.runAllTimersAsync();
    await rejection;
    expect(deleteSelfie).toHaveBeenCalledTimes(3);
    expect(consoleError).toHaveBeenCalledWith("selfie_compensation_exhausted", { correlationId: expect.any(String), errorClass: "ExternalDeleteError" });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret URL");
    consoleError.mockRestore();
  });
  it("retries pending cleanup during reads and removes only deleted IDs", async () => {
    jest.mocked(findProfile).mockResolvedValue({ ...profile, pendingCleanupPublicIds: ["old-id"] } as never);
    await expect(getMyProfile()).resolves.toMatchObject({ email: user.email, selfieUrl: "https://signed.test/selfie" });
    expect(deleteSelfie).toHaveBeenCalledWith("old-id");
    expect(removePendingCleanup).toHaveBeenCalledWith(user.id, "old-id");
  });
  it("surfaces gender when set on the profile, and null when absent", async () => {
    jest.mocked(findProfile).mockResolvedValue(profile as never);
    await expect(getMyProfile()).resolves.toMatchObject({ gender: null });
    jest.mocked(findProfile).mockResolvedValue({ ...profile, gender: "female" } as never);
    await expect(getMyProfile()).resolves.toMatchObject({ gender: "female" });
  });
  it("has no selfie yet: gender is still null, not an error", async () => {
    jest.mocked(findProfile).mockResolvedValue(null);
    await expect(getMyProfile()).resolves.toMatchObject({ selfieUrl: null, gender: null });
  });
});
