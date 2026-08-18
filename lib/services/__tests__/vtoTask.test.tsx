/** @jest-environment node */
import { getTrendById } from "@/lib/data/trends";
import { findProfile, setGenderPreference } from "@/lib/data/userProfiles";
import { createTask, findSuccessfulTasksByUser, findTaskById, updateTaskStatus } from "@/lib/data/vtoTasks";
import { getPrivateSelfieUrl, uploadVtoResult } from "@/lib/external/cloudinary";
import { createShoesTask, downloadResultImage, getTaskStatus } from "@/lib/external/youcam";
import { requireAuthenticatedUser, UnauthorizedError } from "@/lib/services/auth";
import {
  createVtoTask,
  GenderPreferenceRequiredError,
  getVtoHistory,
  getVtoTaskStatus,
  NoSelfieError,
  TaskNotFoundError,
  TrendNotFoundError,
} from "@/lib/services/vtoTask";

jest.mock("@/lib/data/trends", () => ({ getTrendById: jest.fn() }));
jest.mock("@/lib/data/userProfiles", () => ({ findProfile: jest.fn(), setGenderPreference: jest.fn() }));
jest.mock("@/lib/data/vtoTasks", () => ({
  createTask: jest.fn(),
  findTaskById: jest.fn(),
  updateTaskStatus: jest.fn(),
  findSuccessfulTasksByUser: jest.fn(),
}));
jest.mock("@/lib/external/cloudinary", () => ({ getPrivateSelfieUrl: jest.fn(), uploadVtoResult: jest.fn() }));
jest.mock("@/lib/external/youcam", () => ({ createShoesTask: jest.fn(), getTaskStatus: jest.fn(), downloadResultImage: jest.fn() }));
jest.mock("@/lib/services/auth", () => {
  class UnauthorizedError extends Error {}
  return { requireAuthenticatedUser: jest.fn(), UnauthorizedError };
});

const user = { id: "user-1", email: "user@example.com" };
const trend = { id: "chunky-platform-loafer", label: "Chunky Platform Loafer", shoeImageUrl: "/trends/chunky-platform-loafer.png", buyUrl: null };
const profileWithGender = {
  userId: "user-1",
  selfieUrl: "stored",
  selfiePublicId: "selfie-id",
  assetVersion: 1,
  width: 512,
  height: 512,
  format: "jpeg" as const,
  bytes: 10,
  pendingCleanupPublicIds: [],
  gender: "female" as const,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("createVtoTask", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(requireAuthenticatedUser).mockResolvedValue(user);
    jest.mocked(findProfile).mockResolvedValue(profileWithGender as never);
    jest.mocked(getTrendById).mockReturnValue(trend);
    jest.mocked(getPrivateSelfieUrl).mockReturnValue("https://signed.test/selfie.jpg");
    jest.mocked(createShoesTask).mockResolvedValue({ taskId: "task-1" });
    jest.mocked(updateTaskStatus).mockResolvedValue(true);
  });

  it("rejects when unauthenticated", async () => {
    jest.mocked(requireAuthenticatedUser).mockRejectedValue(new UnauthorizedError());
    await expect(createVtoTask("chunky-platform-loafer", "https://app.test")).rejects.toBeInstanceOf(UnauthorizedError);
    expect(createShoesTask).not.toHaveBeenCalled();
  });

  it("rejects when there is no saved selfie", async () => {
    jest.mocked(findProfile).mockResolvedValue(null);
    await expect(createVtoTask("chunky-platform-loafer", "https://app.test")).rejects.toBeInstanceOf(NoSelfieError);
    expect(createShoesTask).not.toHaveBeenCalled();
  });

  it("rejects when no gender is set on the profile and none is supplied", async () => {
    jest.mocked(findProfile).mockResolvedValue({ ...profileWithGender, gender: undefined } as never);
    await expect(createVtoTask("chunky-platform-loafer", "https://app.test")).rejects.toBeInstanceOf(
      GenderPreferenceRequiredError,
    );
    expect(createShoesTask).not.toHaveBeenCalled();
  });

  it("persists a supplied gender choice when the profile has none yet", async () => {
    jest.mocked(findProfile).mockResolvedValue({ ...profileWithGender, gender: undefined } as never);
    await createVtoTask("chunky-platform-loafer", "https://app.test", "male");
    expect(setGenderPreference).toHaveBeenCalledWith("user-1", "male");
    expect(createShoesTask).toHaveBeenCalledWith(expect.objectContaining({ gender: "male" }));
  });

  it("does not re-ask or re-persist gender when the profile already has one", async () => {
    await createVtoTask("chunky-platform-loafer", "https://app.test", "male");
    expect(setGenderPreference).not.toHaveBeenCalled();
    expect(createShoesTask).toHaveBeenCalledWith(expect.objectContaining({ gender: "female" }));
  });

  it("rejects an invalid or missing trend", async () => {
    jest.mocked(getTrendById).mockReturnValue(undefined);
    await expect(createVtoTask("not-a-trend", "https://app.test")).rejects.toBeInstanceOf(TrendNotFoundError);
    expect(createShoesTask).not.toHaveBeenCalled();
    expect(setGenderPreference).not.toHaveBeenCalled();
  });

  it("defensively rejects a gender outside the supported enum", async () => {
    jest.mocked(findProfile).mockResolvedValue({ ...profileWithGender, gender: undefined } as never);
    await expect(createVtoTask("chunky-platform-loafer", "https://app.test", "invalid")).rejects.toBeInstanceOf(
      GenderPreferenceRequiredError,
    );
    expect(setGenderPreference).not.toHaveBeenCalled();
    expect(createShoesTask).not.toHaveBeenCalled();
  });

  it("uses a freshly signed selfie URL, never the raw stored profile.selfieUrl", async () => {
    await createVtoTask("chunky-platform-loafer", "https://app.test");
    expect(getPrivateSelfieUrl).toHaveBeenCalledWith("selfie-id", "jpeg", expect.any(Number), 1800);
    expect(createShoesTask).toHaveBeenCalledWith(
      expect.objectContaining({ srcUrl: "https://signed.test/selfie.jpg" }),
    );
    const [[callArgs]] = jest.mocked(createShoesTask).mock.calls;
    expect(callArgs.srcUrl).not.toBe(profileWithGender.selfieUrl);
  });

  it("builds an absolute ref URL for the trend's static shoe image using the supplied origin", async () => {
    await createVtoTask("chunky-platform-loafer", "https://app.test");
    expect(createShoesTask).toHaveBeenCalledWith(
      expect.objectContaining({ refUrl: "https://app.test/trends/chunky-platform-loafer.png" }),
    );
  });

  it("persists the new task and returns its id and pending status", async () => {
    const result = await createVtoTask("chunky-platform-loafer", "https://app.test");
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: "task-1",
        userId: "user-1",
        trendId: "chunky-platform-loafer",
        status: "pending",
        style: expect.any(String),
        srcUrl: profileWithGender.selfieUrl,
      }),
    );
    expect(result).toEqual({ taskId: "task-1", status: "pending" });
  });
});

describe("getVtoTaskStatus", () => {
  const storedTask = {
    taskId: "task-1",
    userId: "user-1",
    trendId: "chunky-platform-loafer",
    status: "pending" as const,
    srcUrl: "https://signed.test/selfie.jpg",
    refUrl: "https://app.test/trends/chunky-platform-loafer.png",
    style: "random",
    gender: "female" as const,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(requireAuthenticatedUser).mockResolvedValue(user);
    jest.mocked(downloadResultImage).mockResolvedValue(Buffer.from("result-bytes"));
    jest.mocked(uploadVtoResult).mockResolvedValue({ secureUrl: "https://cloud.test/result-asset", publicId: "folder/result-id", format: "jpg" });
    jest.mocked(getPrivateSelfieUrl).mockImplementation((publicId) => `https://signed.test/${publicId}`);
    jest.mocked(updateTaskStatus).mockResolvedValue(true);
  });

  it("rejects when unauthenticated", async () => {
    jest.mocked(requireAuthenticatedUser).mockRejectedValue(new UnauthorizedError());
    await expect(getVtoTaskStatus("task-1")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws TaskNotFoundError when the task does not exist", async () => {
    jest.mocked(findTaskById).mockResolvedValue(null);
    await expect(getVtoTaskStatus("missing")).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("throws the identical TaskNotFoundError when the task belongs to a different user (no ownership leak)", async () => {
    jest.mocked(findTaskById).mockResolvedValue({ ...storedTask, userId: "someone-else" });
    const notFound = await getVtoTaskStatus("missing").catch((e) => e);
    const foreignTask = await getVtoTaskStatus("task-1").catch((e) => e);
    expect(foreignTask).toBeInstanceOf(TaskNotFoundError);
    expect(foreignTask.message).toBe(notFound.message);
  });

  it("refreshes from YouCam when the stored status is still pending", async () => {
    jest.mocked(findTaskById).mockResolvedValue(storedTask);
    jest.mocked(getTaskStatus).mockResolvedValue({ status: "pending" });
    const result = await getVtoTaskStatus("task-1");
    expect(getTaskStatus).toHaveBeenCalledWith("task-1");
    expect(result).toEqual({ taskId: "task-1", status: "pending", resultUrl: undefined, errorCode: undefined });
  });

  it("persists and returns a success transition, copying the result image to durable storage first", async () => {
    jest.mocked(findTaskById).mockResolvedValue(storedTask);
    jest.mocked(getTaskStatus).mockResolvedValue({ status: "success", resultUrl: "https://cdn.test/result.jpg" });
    jest.mocked(updateTaskStatus).mockResolvedValue(true);

    const result = await getVtoTaskStatus("task-1");

    expect(downloadResultImage).toHaveBeenCalledWith("https://cdn.test/result.jpg");
    expect(uploadVtoResult).toHaveBeenCalledWith(Buffer.from("result-bytes"));
    expect(updateTaskStatus).toHaveBeenCalledWith("task-1", {
      status: "success",
      resultPublicId: "folder/result-id",
      resultFormat: "jpg",
    });
    expect(result).toEqual({ taskId: "task-1", status: "success", resultUrl: "https://signed.test/folder/result-id" });
  });

  it("persists and returns an error transition", async () => {
    jest.mocked(findTaskById).mockResolvedValue(storedTask);
    jest.mocked(getTaskStatus).mockResolvedValue({ status: "error", errorCode: "error_no_face" });
    const result = await getVtoTaskStatus("task-1");
    expect(updateTaskStatus).toHaveBeenCalledWith("task-1", { status: "error", errorCode: "error_no_face" });
    expect(result).toEqual({
      taskId: "task-1",
      status: "error",
      message: "We couldn't detect a face — try a front-facing selfie with good lighting.",
    });
    expect(result).not.toHaveProperty("errorCode");
  });

  it.each([
    ["error_no_face", "We couldn't detect a face — try a front-facing selfie with good lighting."],
    ["error_download_image", "We couldn't load one of the images — please try uploading again."],
    ["error_inference", "Something went wrong generating your preview — please try again."],
    ["error_nsfw_content_detected", "This image can't be used — please choose a different photo."],
    ["exceed_max_filesize", "That image is too large (max 10MB) — please choose a smaller file."],
  ])("maps stored YouCam error %s to locked copy without exposing the code", async (errorCode, message) => {
    jest.mocked(findTaskById).mockResolvedValue(storedTask);
    jest.mocked(getTaskStatus).mockResolvedValue({ status: "error", errorCode });

    const result = await getVtoTaskStatus("task-1");

    expect(result).toEqual({ taskId: "task-1", status: "error", message });
    expect(result).not.toHaveProperty("errorCode");
  });

  it.each(["something_new"])(
    "uses generic inference copy for unmapped code %s without exposing it",
    async (errorCode) => {
      jest.mocked(findTaskById).mockResolvedValue(storedTask);
      jest.mocked(getTaskStatus).mockResolvedValue({ status: "error", errorCode });

      const result = await getVtoTaskStatus("task-1");

      expect(result).toEqual({
        taskId: "task-1",
        status: "error",
        message: "Something went wrong generating your preview — please try again.",
      });
      expect(result).not.toHaveProperty("errorCode");
    },
  );

  it("logs invalid_parameter server-side with operational context only", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(findTaskById).mockResolvedValue(storedTask);
    jest.mocked(getTaskStatus).mockResolvedValue({ status: "error", errorCode: "invalid_parameter" });

    await expect(getVtoTaskStatus("task-1")).resolves.toEqual({
      taskId: "task-1",
      status: "error",
      message: "Something went wrong generating your preview — please try again.",
    });

    expect(consoleSpy).toHaveBeenCalledWith("vto_invalid_parameter", {
      correlationId: expect.any(String),
      taskId: "task-1",
    });
    consoleSpy.mockRestore();
  });

  it("maps an already-persisted terminal error through the same locked-copy contract", async () => {
    jest.mocked(findTaskById).mockResolvedValue({ ...storedTask, status: "error", errorCode: "error_download_image" });

    await expect(getVtoTaskStatus("task-1")).resolves.toEqual({
      taskId: "task-1",
      status: "error",
      message: "We couldn't load one of the images — please try uploading again.",
    });
    expect(getTaskStatus).not.toHaveBeenCalled();
  });

  it("returns the authoritative terminal state when another poll wins the update race", async () => {
    jest.mocked(findTaskById)
      .mockResolvedValueOnce(storedTask)
      .mockResolvedValueOnce({ ...storedTask, status: "success", resultPublicId: "folder/winner-id", resultFormat: "png" });
    jest.mocked(getTaskStatus).mockResolvedValue({ status: "error", errorCode: "error_inference" });
    jest.mocked(updateTaskStatus).mockResolvedValue(false);

    await expect(getVtoTaskStatus("task-1")).resolves.toEqual({
      taskId: "task-1",
      status: "success",
      resultUrl: "https://signed.test/folder/winner-id",
      errorCode: undefined,
    });
  });

  it("does not re-poll YouCam for an already-terminal task", async () => {
    jest.mocked(findTaskById).mockResolvedValue({ ...storedTask, status: "success", resultPublicId: "folder/result-id", resultFormat: "jpg" });
    const result = await getVtoTaskStatus("task-1");
    expect(getTaskStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ taskId: "task-1", status: "success", resultUrl: "https://signed.test/folder/result-id", errorCode: undefined });
  });

  it("never re-exposes srcUrl/refUrl to the caller", async () => {
    jest.mocked(findTaskById).mockResolvedValue({ ...storedTask, status: "success", resultPublicId: "folder/result-id", resultFormat: "jpg" });
    const result = await getVtoTaskStatus("task-1");
    expect(result).not.toHaveProperty("srcUrl");
    expect(result).not.toHaveProperty("refUrl");
  });

  it("resolves an already-terminal success task with no stored result reference to an undefined resultUrl, without throwing (AC5, pre-story tasks)", async () => {
    jest.mocked(findTaskById).mockResolvedValue({ ...storedTask, status: "success" });
    const result = await getVtoTaskStatus("task-1");
    expect(result).toEqual({ taskId: "task-1", status: "success", resultUrl: undefined, errorCode: undefined });
  });
});

describe("getVtoHistory", () => {
  const successfulTask = {
    taskId: "task-1",
    userId: "user-1",
    trendId: "chunky-platform-loafer",
    status: "success" as const,
    srcUrl: "stored",
    refUrl: "https://app.test/trends/chunky-platform-loafer.png",
    style: "random",
    gender: "female" as const,
    resultPublicId: "folder/result-id",
    resultFormat: "jpg",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(requireAuthenticatedUser).mockResolvedValue(user);
    jest.mocked(getTrendById).mockReturnValue(trend);
    jest.mocked(getPrivateSelfieUrl).mockImplementation((publicId) => `https://signed.test/${publicId}`);
  });

  it("rejects when unauthenticated", async () => {
    jest.mocked(requireAuthenticatedUser).mockRejectedValue(new UnauthorizedError());
    await expect(getVtoHistory()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("returns an empty list when there are no successful tasks", async () => {
    jest.mocked(findSuccessfulTasksByUser).mockResolvedValue([]);
    await expect(getVtoHistory()).resolves.toEqual([]);
  });

  it("maps well-formed successful tasks to history items, in the order the data layer already sorted them", async () => {
    jest.mocked(findSuccessfulTasksByUser).mockResolvedValue([successfulTask]);
    await expect(getVtoHistory()).resolves.toEqual([
      {
        taskId: "task-1",
        trendLabel: "Chunky Platform Loafer",
        resultUrl: "https://signed.test/folder/result-id",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("filters out a pre-story task missing trendId/result fields instead of producing a broken entry", async () => {
    const malformed = { ...successfulTask, taskId: "task-old", trendId: undefined, resultPublicId: undefined, resultFormat: undefined };
    jest.mocked(findSuccessfulTasksByUser).mockResolvedValue([malformed as never, successfulTask]);
    const result = await getVtoHistory();
    expect(result).toHaveLength(1);
    expect(result[0].taskId).toBe("task-1");
  });

  it("filters out a task whose trend can no longer be resolved", async () => {
    jest.mocked(getTrendById).mockReturnValue(undefined);
    jest.mocked(findSuccessfulTasksByUser).mockResolvedValue([successfulTask]);
    await expect(getVtoHistory()).resolves.toEqual([]);
  });
});
