/** @jest-environment node */
import { getTrendById } from "@/lib/data/trends";
import { findProfile, setGenderPreference } from "@/lib/data/userProfiles";
import { createTask, findTaskById, updateTaskStatus } from "@/lib/data/vtoTasks";
import { getPrivateSelfieUrl } from "@/lib/external/cloudinary";
import { createShoesTask, getTaskStatus } from "@/lib/external/youcam";
import { requireAuthenticatedUser, UnauthorizedError } from "@/lib/services/auth";
import {
  createVtoTask,
  GenderPreferenceRequiredError,
  getVtoTaskStatus,
  NoSelfieError,
  TaskNotFoundError,
  TrendNotFoundError,
} from "@/lib/services/vtoTask";

jest.mock("@/lib/data/trends", () => ({ getTrendById: jest.fn() }));
jest.mock("@/lib/data/userProfiles", () => ({ findProfile: jest.fn(), setGenderPreference: jest.fn() }));
jest.mock("@/lib/data/vtoTasks", () => ({ createTask: jest.fn(), findTaskById: jest.fn(), updateTaskStatus: jest.fn() }));
jest.mock("@/lib/external/cloudinary", () => ({ getPrivateSelfieUrl: jest.fn() }));
jest.mock("@/lib/external/youcam", () => ({ createShoesTask: jest.fn(), getTaskStatus: jest.fn() }));
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
      expect.objectContaining({ taskId: "task-1", userId: "user-1", status: "pending", style: expect.any(String) }),
    );
    expect(result).toEqual({ taskId: "task-1", status: "pending" });
  });
});

describe("getVtoTaskStatus", () => {
  const storedTask = {
    taskId: "task-1",
    userId: "user-1",
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

  it("persists and returns a success transition", async () => {
    jest.mocked(findTaskById).mockResolvedValue(storedTask);
    jest.mocked(getTaskStatus).mockResolvedValue({ status: "success", resultUrl: "https://cdn.test/result.jpg" });
    const result = await getVtoTaskStatus("task-1");
    expect(updateTaskStatus).toHaveBeenCalledWith("task-1", { status: "success", resultUrl: "https://cdn.test/result.jpg" });
    expect(result).toEqual({ taskId: "task-1", status: "success", resultUrl: "https://cdn.test/result.jpg" });
  });

  it("persists and returns an error transition", async () => {
    jest.mocked(findTaskById).mockResolvedValue(storedTask);
    jest.mocked(getTaskStatus).mockResolvedValue({ status: "error", errorCode: "error_no_face" });
    const result = await getVtoTaskStatus("task-1");
    expect(updateTaskStatus).toHaveBeenCalledWith("task-1", { status: "error", errorCode: "error_no_face" });
    expect(result).toEqual({ taskId: "task-1", status: "error", errorCode: "error_no_face" });
  });

  it("does not re-poll YouCam for an already-terminal task", async () => {
    jest.mocked(findTaskById).mockResolvedValue({ ...storedTask, status: "success", resultUrl: "https://cdn.test/result.jpg" });
    const result = await getVtoTaskStatus("task-1");
    expect(getTaskStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ taskId: "task-1", status: "success", resultUrl: "https://cdn.test/result.jpg", errorCode: undefined });
  });

  it("never re-exposes srcUrl/refUrl to the caller", async () => {
    jest.mocked(findTaskById).mockResolvedValue({ ...storedTask, status: "success", resultUrl: "https://cdn.test/result.jpg" });
    const result = await getVtoTaskStatus("task-1");
    expect(result).not.toHaveProperty("srcUrl");
    expect(result).not.toHaveProperty("refUrl");
  });
});
