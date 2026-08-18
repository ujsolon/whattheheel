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

    it("rejects an unknown or missing upstream task status instead of polling forever", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 200, data: { task_status: "queued_some_new_way" } }),
      });
      const { getTaskStatus, YouCamApiError } = await import("@/lib/external/youcam");

      const error = await getTaskStatus("task-123").catch((cause) => cause);
      expect(error).toBeInstanceOf(YouCamApiError);
      expect(error.code).toBe("youcam_unexpected_response");
    });

    it("rejects a success response with a non-HTTPS result URL", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { task_status: "success", results: { url: "http://cdn.test/result.jpg" } } }),
      });
      const { getTaskStatus, YouCamApiError } = await import("@/lib/external/youcam");

      await expect(getTaskStatus("task-123")).rejects.toBeInstanceOf(YouCamApiError);
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

    it("bounds upstream requests with an abort signal", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { task_status: "running" } }),
      });
      const { getTaskStatus } = await import("@/lib/external/youcam");

      await getTaskStatus("task-123");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  describe("downloadResultImage", () => {
    function mockImageResponse(bytes: Uint8Array, contentType = "image/jpeg") {
      return {
        ok: true,
        status: 200,
        headers: new Map([
          ["content-type", contentType],
          ["content-length", String(bytes.byteLength)],
        ]),
        arrayBuffer: async () => bytes.buffer,
      };
    }

    it("fetches the given URL and resolves to a Buffer of the response body", async () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      (global.fetch as jest.Mock).mockResolvedValue(mockImageResponse(bytes));
      const { downloadResultImage } = await import("@/lib/external/youcam");

      const result = await downloadResultImage("https://cdn.test/result.jpg");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://cdn.test/result.jpg",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });

    it("throws a typed YouCamApiError on a non-2xx response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, headers: new Map() });
      const { downloadResultImage, YouCamApiError } = await import("@/lib/external/youcam");

      const error = await downloadResultImage("https://cdn.test/result.jpg").catch((e) => e);

      expect(error).toBeInstanceOf(YouCamApiError);
      expect(error.code).toBe("youcam_result_download_failed");
    });

    it("throws a typed YouCamApiError on a network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("fetch failed"));
      const { downloadResultImage, YouCamApiError } = await import("@/lib/external/youcam");

      const error = await downloadResultImage("https://cdn.test/result.jpg").catch((e) => e);

      expect(error).toBeInstanceOf(YouCamApiError);
      expect(error.code).toBe("youcam_result_download_failed");
    });

    it("rejects a non-image content-type (e.g. an HTML error page served with a 200)", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockImageResponse(new Uint8Array([1]), "text/html"));
      const { downloadResultImage, YouCamApiError } = await import("@/lib/external/youcam");

      const error = await downloadResultImage("https://cdn.test/result.jpg").catch((e) => e);

      expect(error).toBeInstanceOf(YouCamApiError);
      expect(error.code).toBe("youcam_result_download_failed");
    });

    it("rejects an empty response body", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockImageResponse(new Uint8Array([])));
      const { downloadResultImage, YouCamApiError } = await import("@/lib/external/youcam");

      const error = await downloadResultImage("https://cdn.test/result.jpg").catch((e) => e);

      expect(error).toBeInstanceOf(YouCamApiError);
      expect(error.code).toBe("youcam_result_download_failed");
    });

    it("rejects a response whose declared content-length exceeds the size cap", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([
          ["content-type", "image/jpeg"],
          ["content-length", "50000000"],
        ]),
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      });
      const { downloadResultImage, YouCamApiError } = await import("@/lib/external/youcam");

      const error = await downloadResultImage("https://cdn.test/result.jpg").catch((e) => e);

      expect(error).toBeInstanceOf(YouCamApiError);
      expect(error.code).toBe("youcam_result_download_failed");
    });
  });
});
