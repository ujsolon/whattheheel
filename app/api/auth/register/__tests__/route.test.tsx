/** @jest-environment node */

import { POST } from "@/app/api/auth/register/route";
import {
  DuplicateRegistrationError,
  enforceRegistrationThrottle,
  InvalidCredentialsInputError,
  RegistrationRateLimitError,
  registerUser,
} from "@/lib/services/auth";

jest.mock("@/lib/services/auth", () => {
  class InvalidCredentialsInputError extends Error {
    constructor(public readonly code: "invalid_email" | "invalid_password", message: string) {
      super(message);
    }
  }
  class DuplicateRegistrationError extends Error {}
  class RegistrationRateLimitError extends Error {
    constructor(public readonly retryAfterSeconds: number) {
      super("Too many registration attempts. Please wait and try again.");
    }
  }
  return {
    registerUser: jest.fn(),
    enforceRegistrationThrottle: jest.fn(),
    InvalidCredentialsInputError,
    DuplicateRegistrationError,
    RegistrationRateLimitError,
  };
});

const mockedRegisterUser = jest.mocked(registerUser);
const mockedEnforceThrottle = jest.mocked(enforceRegistrationThrottle);

function registrationRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.5", ...headers },
    body,
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnforceThrottle.mockResolvedValue(undefined);
  });

  it("creates a user through the service boundary", async () => {
    mockedRegisterUser.mockResolvedValue({
      id: "abc123",
      email: "jordan@example.com",
      passwordHash: "secret",
      createdAt: new Date(),
    });

    const response = await POST(
      registrationRequest(JSON.stringify({ email: "jordan@example.com", password: "longenough1" })),
    );

    expect(response.status).toBe(201);
    expect(mockedEnforceThrottle).toHaveBeenCalledWith("203.0.113.5");
    expect(mockedRegisterUser).toHaveBeenCalledWith("jordan@example.com", "longenough1");
  });

  it("rejects declared and streamed oversized bodies before registration", async () => {
    const declared = await POST(
      registrationRequest("{}", { "content-length": String(17 * 1024) }),
    );
    const streamed = await POST(registrationRequest("x".repeat(17 * 1024)));

    expect(declared.status).toBe(413);
    expect(streamed.status).toBe(413);
    expect(mockedRegisterUser).not.toHaveBeenCalled();
  });

  it("maps service validation and duplicate outcomes", async () => {
    mockedRegisterUser.mockRejectedValueOnce(
      new InvalidCredentialsInputError("invalid_email", "Enter a valid email address."),
    );
    const invalid = await POST(registrationRequest("{}"));
    mockedRegisterUser.mockRejectedValueOnce(new DuplicateRegistrationError());
    const duplicate = await POST(registrationRequest("{}"));

    expect(invalid.status).toBe(400);
    expect(duplicate.status).toBe(409);
  });

  it("returns a stable retryable response when throttled", async () => {
    mockedEnforceThrottle.mockRejectedValue(new RegistrationRateLimitError(321));

    const response = await POST(registrationRequest("{}"));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("321");
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "rate_limited",
        message: "Too many registration attempts. Please wait and try again.",
      },
    });
  });
});
