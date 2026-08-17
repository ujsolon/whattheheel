/** @jest-environment node */

import { redirect } from "next/navigation";
import StylistPage from "@/app/stylist/page";
import { UnauthorizedError } from "@/lib/services/auth";
import { getMyProfile } from "@/lib/services/profile";

jest.mock("next/navigation", () => ({ redirect: jest.fn(() => { throw new Error("redirected"); }) }));
jest.mock("@/lib/services/profile", () => ({ getMyProfile: jest.fn() }));
jest.mock("@/lib/services/auth", () => {
  class UnauthorizedError extends Error {}
  return { UnauthorizedError };
});
jest.mock("@/app/components/VtoStylist", () => ({ VtoStylist: () => null }));

describe("StylistPage gating", () => {
  beforeEach(() => jest.clearAllMocks());

  it("redirects to register, preserving a carried-over trend, when signed out", async () => {
    jest.mocked(getMyProfile).mockRejectedValue(new UnauthorizedError());
    await expect(
      StylistPage({ searchParams: Promise.resolve({ trend: "chunky-platform-loafer" }) } as never),
    ).rejects.toThrow("redirected");
    expect(redirect).toHaveBeenCalledWith(
      "/register?callbackUrl=%2Fstylist%3Ftrend%3Dchunky-platform-loafer&trend=chunky-platform-loafer",
    );
  });

  it("redirects to register with no trend param when none was carried over", async () => {
    jest.mocked(getMyProfile).mockRejectedValue(new UnauthorizedError());
    await expect(StylistPage({ searchParams: Promise.resolve({}) } as never)).rejects.toThrow("redirected");
    expect(redirect).toHaveBeenCalledWith("/register?callbackUrl=%2Fstylist");
  });

  it("redirects to /profile when signed in but no selfie is saved", async () => {
    jest.mocked(getMyProfile).mockResolvedValue({ email: "a@b.com", selfieUrl: null, updatedAt: null, gender: null });
    await expect(StylistPage({ searchParams: Promise.resolve({}) } as never)).rejects.toThrow("redirected");
    expect(redirect).toHaveBeenCalledWith("/profile");
  });
});
