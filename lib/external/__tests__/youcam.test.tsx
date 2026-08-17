const ORIGINAL_ENV = process.env;

describe("youcam client", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, YOUCAM_API_KEY: "test-key", YOUCAM_API_BASE_URL: "https://yce-api-01.makeupar.com" };
    global.fetch = jest.fn();
  });
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("createShoesTask", () => {
    it("POSTs to the shoes task endpoint with a bearer token and the expected body", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 200, data: { task_id: "task-123" } }),
      });
      const { createShoesTask } = await import("@/lib/external/youcam");

      const result = await createShoesTask({
        srcUrl: "https://example.test/selfie.jpg",
        refUrl: "https://example.test/shoe.png",
        gender: "female",
        style: "random",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://yce-api-01.makeupar.com/s2s/v2.0/task/shoes",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            src_file_url: "https://example.test/selfie.jpg",
            ref_file_url: "https://example.test/shoe.png",
            gender: "female",
            style: "random",
          }),
        }),
      );
      expect(result).toEqual({ taskId: "task-123" });
    });

    it("throws a typed YouCamApiError with the response body's error code on a non-2xx response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ status: 400, error: { code: "invalid_parameter", message: "bad gender" } }),
      });
      const { createShoesTask, YouCamApiError } = await import("@/lib/external/youcam");

      const error = await createShoesTask({
        srcUrl: "https://example.test/selfie.jpg",
        refUrl: "https://example.test/shoe.png",
        gender: "female",
        style: "random",
      }).catch((e) => e);

      expect(error).toBeInstanceOf(YouCamApiError);
      expect(error.code).toBe("invalid_parameter");
    });

    it("throws a typed YouCamApiError with a route-local code on a network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("fetch failed"));
      const { createShoesTask, YouCamApiError } = await import("@/lib/external/youcam");

      const error = await createShoesTask({
        srcUrl: "https://example.test/selfie.jpg",
        refUrl: "https://example.test/shoe.png",
        gender: "female",
        style: "random",
      }).catch((e) => e);

      expect(error).toBeInstanceOf(YouCamApiError);
      expect(error.code).toBe("youcam_network_error");
    });
  });

  describe("getTaskStatus", () => {
    it("normalizes a running task to pending", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 200, data: { task_status: "running", error: null } }),
      });
      const { getTaskStatus } = await import("@/lib/external/youcam");

      const result = await getTaskStatus("task-123");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://yce-api-01.makeupar.com/s2s/v2.0/task/shoes/task-123",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual({ status: "pending" });
    });

    // Confirmed live via Perfect Corp's own API playground:
    // { status: 200, data: { error: null, results: { url: "..." }, task_status: "success" } }
    it("extracts the result image URL on success (confirmed real response shape)", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          data: { error: null, results: { url: "https://cdn.test/result.jpg" }, task_status: "success" },
        }),
      });
      const { getTaskStatus } = await import("@/lib/external/youcam");

      await expect(getTaskStatus("task-123")).resolves.toEqual({
        status: "success",
        resultUrl: "https://cdn.test/result.jpg",
      });
    });

    it("falls back to a nested output array if results.url is absent", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          data: { task_status: "success", results: { output: [{ url: "https://cdn.test/fallback.jpg" }] } },
        }),
      });
      const { getTaskStatus } = await import("@/lib/external/youcam");

      await expect(getTaskStatus("task-123")).resolves.toEqual({
        status: "success",
        resultUrl: "https://cdn.test/fallback.jpg",
      });
    });

    it("extracts the error code on failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 200, data: { task_status: "error", error: "error_no_face" } }),
      });
      const { getTaskStatus } = await import("@/lib/external/youcam");

      await expect(getTaskStatus("task-123")).resolves.toEqual({
        status: "error",
        errorCode: "error_no_face",
      });
    });

    it("throws YouCamApiError on a non-2xx status response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ status: 404, error: { code: "not_found" } }),
      });
      const { getTaskStatus, YouCamApiError } = await import("@/lib/external/youcam");

      await expect(getTaskStatus("task-123")).rejects.toBeInstanceOf(YouCamApiError);
    });
  });
});
