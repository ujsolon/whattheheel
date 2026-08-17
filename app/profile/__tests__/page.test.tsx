/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import ProfilePage from "@/app/profile/page";
import { UnauthorizedError } from "@/lib/services/auth";
import { getMyProfile } from "@/lib/services/profile";
import { getVtoHistory } from "@/lib/services/vtoTask";

jest.mock("next/navigation", () => ({ redirect: jest.fn(() => { throw new Error("redirected"); }) }));
jest.mock("@/lib/services/profile", () => ({ getMyProfile: jest.fn() }));
jest.mock("@/lib/services/vtoTask", () => ({ getVtoHistory: jest.fn() }));
jest.mock("@/lib/services/auth", () => {
  class UnauthorizedError extends Error {}
  return { UnauthorizedError };
});
jest.mock("@/app/components/SelfieUploadForm", () => ({ SelfieUploadForm: () => null }));
jest.mock("@/app/components/SignOutButton", () => ({ SignOutButton: () => null }));

describe("ProfilePage anonymous continuation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMyProfile).mockRejectedValue(new UnauthorizedError());
  });

  it("preserves a known trend through the registration callback", async () => {
    await expect(ProfilePage({ searchParams: Promise.resolve({ trend: "chunky-platform-loafer" }) } as never)).rejects.toThrow("redirected");
    expect(redirect).toHaveBeenCalledWith(
      "/register?callbackUrl=%2Fprofile%3Ftrend%3Dchunky-platform-loafer&trend=chunky-platform-loafer",
    );
  });

  it("drops unknown and non-scalar trend values", async () => {
    for (const trend of ["not-a-trend", ["chunky-platform-loafer"]]) {
      await expect(ProfilePage({ searchParams: Promise.resolve({ trend }) } as never)).rejects.toThrow("redirected");
      expect(redirect).toHaveBeenLastCalledWith("/register?callbackUrl=%2Fprofile");
    }
  });
});

describe("ProfilePage authenticated continuation", () => {
  const profile = { email: "a@b.com", selfieUrl: "https://signed.test/selfie.jpg", updatedAt: "2026-01-01", gender: null };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getMyProfile).mockResolvedValue(profile);
    jest.mocked(getVtoHistory).mockResolvedValue([]);
  });

  it("shows a Past Try-Ons history section when the user has successful VTO results", async () => {
    jest.mocked(getVtoHistory).mockResolvedValue([
      { taskId: "task-1", trendLabel: "Chunky Platform Loafer", resultUrl: "https://cdn.test/one.jpg", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const element = await ProfilePage({ searchParams: Promise.resolve({}) } as never);
    render(element);
    expect(screen.getByText("Past Try-Ons")).toBeInTheDocument();
  });

  it("omits the Past Try-Ons section entirely when there is no VTO history", async () => {
    const element = await ProfilePage({ searchParams: Promise.resolve({}) } as never);
    render(element);
    expect(screen.queryByText("Past Try-Ons")).not.toBeInTheDocument();
  });

  it("shows a Continue to AI Stylist link when a known trend is carried over and a selfie is saved", async () => {
    const element = await ProfilePage({ searchParams: Promise.resolve({ trend: "chunky-platform-loafer" }) } as never);
    render(element);
    expect(screen.getByRole("link", { name: /continue to ai stylist/i })).toHaveAttribute(
      "href",
      "/stylist?trend=chunky-platform-loafer",
    );
  });

  it("omits the link when no trend is carried over", async () => {
    const element = await ProfilePage({ searchParams: Promise.resolve({}) } as never);
    render(element);
    expect(screen.queryByRole("link", { name: /continue to ai stylist/i })).not.toBeInTheDocument();
  });

  it("omits the link when no selfie is saved yet, even with a carried-over trend", async () => {
    jest.mocked(getMyProfile).mockResolvedValue({ ...profile, selfieUrl: null });
    const element = await ProfilePage({ searchParams: Promise.resolve({ trend: "chunky-platform-loafer" }) } as never);
    render(element);
    expect(screen.queryByRole("link", { name: /continue to ai stylist/i })).not.toBeInTheDocument();
  });
});
