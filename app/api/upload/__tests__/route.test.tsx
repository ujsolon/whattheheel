/** @jest-environment node */
import { UnauthorizedError } from "@/lib/services/auth";
import { ImageValidationError } from "@/lib/services/imageValidation";
import { ProfileConflictError, uploadMySelfie } from "@/lib/services/profile";
import { POST } from "@/app/api/upload/route";

jest.mock("@/lib/services/profile", () => {
  class ProfileConflictError extends Error {}
  return { uploadMySelfie: jest.fn(), ProfileConflictError };
});
jest.mock("@/lib/services/auth", () => {
  class UnauthorizedError extends Error {}
  return { UnauthorizedError };
});
jest.mock("@/lib/services/imageValidation", () => {
  class ImageValidationError extends Error { constructor(public code: string, message: string) { super(message); } }
  return { ImageValidationError };
});

function request(form: FormData, headers?: HeadersInit) { return new Request("http://local/api/upload", { method: "POST", body: form, headers }); }

describe("POST /api/upload", () => {
  beforeEach(() => jest.clearAllMocks());
  it("returns the exact success envelope without internal identifiers", async () => {
    jest.mocked(uploadMySelfie).mockResolvedValue({ email: "a@b.com", selfieUrl: "https://signed", updatedAt: "2026-01-01", gender: null });
    const form = new FormData(); form.append("selfie", new File(["image"], "selfie.jpg", { type: "image/jpeg" }));
    const response = await POST(request(form));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { profile: { email: "a@b.com", selfieUrl: "https://signed", updatedAt: "2026-01-01", gender: null } } });
  });
  it("rejects missing, duplicate, and unexpected file fields before service calls", async () => {
    for (const form of [new FormData(), (() => { const f = new FormData(); f.append("selfie", new File(["a"], "a.jpg")); f.append("selfie", new File(["b"], "b.jpg")); return f; })(), (() => { const f = new FormData(); f.append("selfie", new File(["a"], "a.jpg")); f.append("avatar", new File(["b"], "b.jpg")); return f; })()]) {
      const response = await POST(request(form)); expect(response.status).toBe(400);
    }
    expect(uploadMySelfie).not.toHaveBeenCalled();
  });
  it.each([
    [new UnauthorizedError(), 401, "unauthorized"],
    [new ImageValidationError("unsupported_format" as never, "Use a JPG or PNG image."), 400, "unsupported_format"],
    [new ImageValidationError("file_too_large" as never, "too large"), 413, "file_too_large"],
    [new ProfileConflictError(), 409, "profile_conflict"],
  ])("maps service error %# to its stable envelope", async (cause, status, code) => {
    jest.mocked(uploadMySelfie).mockRejectedValue(cause);
    const form = new FormData(); form.append("selfie", new File(["image"], "selfie.jpg"));
    const response = await POST(request(form));
    expect(response.status).toBe(status); expect(await response.json()).toEqual(expect.objectContaining({ error: expect.objectContaining({ code }) }));
  });
  it("enforces the multipart cap even with an understated Content-Length", async () => {
    const body = new Uint8Array(10_100_001);
    const response = await POST(new Request("http://local/api/upload", { method: "POST", body, headers: { "content-type": "multipart/form-data; boundary=x", "content-length": "1" } }));
    expect(response.status).toBe(413); expect(await response.json()).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: "payload_too_large" }) }));
    expect(uploadMySelfie).not.toHaveBeenCalled();
  });
});
