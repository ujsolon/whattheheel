/** @jest-environment node */
import { UnauthorizedError } from "@/lib/services/auth";
import {
  createVtoTask,
  GenderPreferenceRequiredError,
  NoSelfieError,
  TrendNotFoundError,
} from "@/lib/services/vtoTask";
import { YouCamApiError } from "@/lib/external/youcam";
import { POST } from "@/app/api/vto-tasks/route";

jest.mock("@/lib/services/vtoTask", () => {
  class NoSelfieError extends Error {}
  class GenderPreferenceRequiredError extends Error {}
  class TrendNotFoundError extends Error {}
  return { createVtoTask: jest.fn(), NoSelfieError, GenderPreferenceRequiredError, TrendNotFoundError };
});
jest.mock("@/lib/services/auth", () => {
  class UnauthorizedError extends Error {}
  return { UnauthorizedError };
});
jest.mock("@/lib/external/youcam", () => {
  class YouCamApiError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }
  return { YouCamApiError };
});

function request(body: unknown) {
  return new Request("http://app.test/api/vto-tasks", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/vto-tasks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://trusted.test";
  });

  it("passes a trusted configured origin and validated body fields to the service", async () => {
    jest.mocked(createVtoTask).mockResolvedValue({ taskId: "task-1", status: "pending" });
    const response = await POST(request({ trendId: "chunky-platform-loafer", gender: "female" }));
    expect(createVtoTask).toHaveBeenCalledWith("chunky-platform-loafer", "https://trusted.test", "female");
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { taskId: "task-1", status: "pending" } });
  });

  it("omits gender when the client sends none", async () => {
    jest.mocked(createVtoTask).mockResolvedValue({ taskId: "task-1", status: "pending" });
    await POST(request({ trendId: "chunky-platform-loafer" }));
    expect(createVtoTask).toHaveBeenCalledWith("chunky-platform-loafer", "https://trusted.test", undefined);
  });

  it.each([
    [new UnauthorizedError(), 401, "unauthorized"],
    [new NoSelfieError(), 409, "no_selfie"],
    [new GenderPreferenceRequiredError(), 400, "gender_required"],
    [new TrendNotFoundError(), 400, "trend_not_found"],
    [new YouCamApiError("error_no_face", "no face"), 502, "error_no_face"],
  ])("maps service error %# to its stable envelope", async (cause, status, code) => {
    jest.mocked(createVtoTask).mockRejectedValue(cause);
    const response = await POST(request({ trendId: "chunky-platform-loafer" }));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.objectContaining({ code }) }));
  });

  it("rejects a missing or malformed trendId before calling the service", async () => {
    const response = await POST(request({}));
    expect(response.status).toBe(400);
    expect(createVtoTask).not.toHaveBeenCalled();
  });

  it("rejects a gender outside the supported enum before calling the service", async () => {
    const response = await POST(request({ trendId: "chunky-platform-loafer", gender: "invalid" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: "invalid_gender" }) }));
    expect(createVtoTask).not.toHaveBeenCalled();
  });

  it("rejects an oversized JSON body before parsing or calling the service", async () => {
    const response = await POST(request({ trendId: "x".repeat(17_000) }));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: "payload_too_large" }) }));
    expect(createVtoTask).not.toHaveBeenCalled();
  });
});
