/** @jest-environment node */
import { UnauthorizedError } from "@/lib/services/auth";
import { getVtoTaskStatus, TaskNotFoundError } from "@/lib/services/vtoTask";
import { GET } from "@/app/api/vto-tasks/[id]/route";
import { YouCamApiError } from "@/lib/external/youcam";

jest.mock("@/lib/services/vtoTask", () => {
  class TaskNotFoundError extends Error {}
  return { getVtoTaskStatus: jest.fn(), TaskNotFoundError };
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

function request() {
  return new Request("http://app.test/api/vto-tasks/task-1");
}

describe("GET /api/vto-tasks/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the task view under the standard data envelope", async () => {
    jest.mocked(getVtoTaskStatus).mockResolvedValue({ taskId: "task-1", status: "pending" });
    const response = await GET(request(), { params: Promise.resolve({ id: "task-1" }) });
    expect(getVtoTaskStatus).toHaveBeenCalledWith("task-1");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { taskId: "task-1", status: "pending" } });
  });

  it.each([
    [new UnauthorizedError(), 401, "unauthorized"],
    [new TaskNotFoundError(), 404, "not_found"],
    [new YouCamApiError("youcam_network_error", "network"), 502, "youcam_network_error"],
  ])("maps service error %# to its stable envelope", async (cause, status, code) => {
    jest.mocked(getVtoTaskStatus).mockRejectedValue(cause);
    const response = await GET(request(), { params: Promise.resolve({ id: "task-1" }) });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.objectContaining({ code }) }));
  });
});
