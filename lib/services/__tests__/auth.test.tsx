import bcrypt from "bcryptjs";

import { createUser, DuplicateEmailError, findUserByEmail } from "@/lib/data/users";
import { authOptions, InvalidCredentialsInputError, registerUser } from "@/lib/services/auth";

// `@/lib/data/users` transitively imports the real `mongodb`/`bson` packages
// (ESM Jest can't parse) via `@/lib/data/mongodb` — mock the whole module,
// including a lightweight stand-in for the real `DuplicateEmailError` class.
jest.mock("@/lib/data/users", () => {
  class DuplicateEmailError extends Error {}
  return {
    findUserByEmail: jest.fn(),
    createUser: jest.fn(),
    DuplicateEmailError,
  };
});
jest.mock("bcryptjs", () => ({ compare: jest.fn(), hash: jest.fn() }));

const mockedFindUserByEmail = jest.mocked(findUserByEmail);
const mockedCreateUser = jest.mocked(createUser);
const mockedCompare = jest.mocked(bcrypt.compare);
const mockedHash = jest.mocked(bcrypt.hash);

function authorize(credentials: Record<string, string> | undefined) {
  const provider = authOptions.providers[0] as unknown as {
    options: { authorize: (credentials: unknown) => Promise<unknown> };
  };
  return provider.options.authorize(credentials);
}

describe("authOptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the JWT session strategy (Credentials provider requires it)", () => {
    expect(authOptions.session).toEqual({ strategy: "jwt" });
  });

  it("configures no adapter", () => {
    expect(authOptions.adapter).toBeUndefined();
  });

  describe("authorize", () => {
    it("returns null when credentials are missing", async () => {
      await expect(authorize(undefined)).resolves.toBeNull();
      await expect(authorize({ email: "jordan@example.com" })).resolves.toBeNull();
      await expect(authorize({ password: "secret123" })).resolves.toBeNull();
      expect(mockedFindUserByEmail).not.toHaveBeenCalled();
    });

    it("returns null when the email is not registered", async () => {
      mockedFindUserByEmail.mockResolvedValue(null);

      const result = await authorize({ email: "nobody@example.com", password: "secret123" });

      expect(result).toBeNull();
      expect(mockedCompare).not.toHaveBeenCalled();
    });

    it("returns null when the password does not match", async () => {
      mockedFindUserByEmail.mockResolvedValue({
        id: "abc123",
        email: "jordan@example.com",
        passwordHash: "hashed",
        createdAt: new Date(),
      });
      mockedCompare.mockResolvedValue(false as never);

      const result = await authorize({ email: "jordan@example.com", password: "wrong" });

      expect(result).toBeNull();
    });

    it("returns the user (id, email) on valid credentials", async () => {
      mockedFindUserByEmail.mockResolvedValue({
        id: "abc123",
        email: "jordan@example.com",
        passwordHash: "hashed",
        createdAt: new Date(),
      });
      mockedCompare.mockResolvedValue(true as never);

      const result = await authorize({ email: "jordan@example.com", password: "correct" });

      expect(result).toEqual({ id: "abc123", email: "jordan@example.com" });
    });

    it("never throws — unknown email and wrong password both resolve to null identically", async () => {
      mockedFindUserByEmail.mockResolvedValueOnce(null);
      const unknownEmailResult = await authorize({
        email: "nobody@example.com",
        password: "secret123",
      });

      mockedFindUserByEmail.mockResolvedValueOnce({
        id: "abc123",
        email: "jordan@example.com",
        passwordHash: "hashed",
        createdAt: new Date(),
      });
      mockedCompare.mockResolvedValueOnce(false as never);
      const wrongPasswordResult = await authorize({
        email: "jordan@example.com",
        password: "wrong",
      });

      expect(unknownEmailResult).toBeNull();
      expect(wrongPasswordResult).toBeNull();
      expect(unknownEmailResult).toBe(wrongPasswordResult);
    });
  });
});

describe("registerUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects a malformed email without touching bcrypt or the database", async () => {
    await expect(registerUser("not-an-email", "longenough1")).rejects.toBeInstanceOf(
      InvalidCredentialsInputError,
    );
    expect(mockedHash).not.toHaveBeenCalled();
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 8 characters", async () => {
    await expect(registerUser("jordan@example.com", "short1")).rejects.toBeInstanceOf(
      InvalidCredentialsInputError,
    );
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it("hashes the password and creates the user on valid input", async () => {
    mockedHash.mockResolvedValue("hashed-password" as never);
    mockedCreateUser.mockResolvedValue({
      id: "abc123",
      email: "jordan@example.com",
      passwordHash: "hashed-password",
      createdAt: new Date(),
    });

    const result = await registerUser("jordan@example.com", "longenough1");

    expect(mockedHash).toHaveBeenCalledWith("longenough1", expect.any(Number));
    expect(mockedCreateUser).toHaveBeenCalledWith("jordan@example.com", "hashed-password");
    expect(result.id).toBe("abc123");
  });

  it("propagates DuplicateEmailError unchanged", async () => {
    mockedHash.mockResolvedValue("hashed-password" as never);
    mockedCreateUser.mockRejectedValue(new DuplicateEmailError());

    await expect(registerUser("jordan@example.com", "longenough1")).rejects.toBeInstanceOf(
      DuplicateEmailError,
    );
  });
});
