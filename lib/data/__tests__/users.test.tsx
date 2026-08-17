const findOne = jest.fn();
const insertOne = jest.fn();
const createIndex = jest.fn().mockResolvedValue(undefined);
const collection = jest.fn().mockReturnValue({ findOne, insertOne, createIndex });
const getDb = jest.fn().mockResolvedValue({ collection });

jest.mock("@/lib/data/mongodb", () => ({ getDb }));

// The real `mongodb`/`bson` packages ship ESM that Jest's default transform
// can't parse; mock a minimal ObjectId rather than pulling in the real driver.
jest.mock("mongodb", () => {
  class MockObjectId {
    private readonly hex = Math.random().toString(16).slice(2).padEnd(24, "0").slice(0, 24);

    toHexString() {
      return this.hex;
    }
  }

  return { ObjectId: MockObjectId };
});

describe("users data boundary", () => {
  let createUser: typeof import("@/lib/data/users").createUser;
  let findUserByEmail: typeof import("@/lib/data/users").findUserByEmail;
  let DuplicateEmailError: typeof import("@/lib/data/users").DuplicateEmailError;

  beforeEach(async () => {
    jest.clearAllMocks();
    createIndex.mockResolvedValue(undefined);
    ({ createUser, findUserByEmail, DuplicateEmailError } = await import("@/lib/data/users"));
  });

  describe("findUserByEmail", () => {
    it("returns null when no user matches", async () => {
      findOne.mockResolvedValue(null);

      const result = await findUserByEmail("nobody@example.com");

      expect(result).toBeNull();
    });

    it("returns the mapped user when found", async () => {
      const createdAt = new Date("2026-08-17T00:00:00.000Z");
      findOne.mockResolvedValue({
        _id: { toHexString: () => "abc123" },
        email: "jordan@example.com",
        passwordHash: "hashed",
        createdAt,
      });

      const result = await findUserByEmail("Jordan@Example.com");

      expect(findOne).toHaveBeenCalledWith({ email: "jordan@example.com" });
      expect(result).toEqual({
        id: "abc123",
        email: "jordan@example.com",
        passwordHash: "hashed",
        createdAt,
      });
    });

    it("ensures a unique index on email before querying", async () => {
      findOne.mockResolvedValue(null);

      await findUserByEmail("nobody@example.com");

      expect(createIndex).toHaveBeenCalledWith({ email: 1 }, { unique: true });
    });
  });

  describe("createUser", () => {
    it("normalizes, inserts, and returns the created user", async () => {
      findOne.mockResolvedValue(null);
      insertOne.mockResolvedValue({ acknowledged: true });

      const result = await createUser("  Jordan@Example.com  ", "hashed-password");

      expect(insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "jordan@example.com",
          passwordHash: "hashed-password",
        }),
      );
      expect(result.email).toBe("jordan@example.com");
      expect(result.passwordHash).toBe("hashed-password");
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it("throws DuplicateEmailError when the email is already registered (pre-check)", async () => {
      findOne.mockResolvedValue({
        _id: { toHexString: () => "existing" },
        email: "jordan@example.com",
        passwordHash: "hashed",
        createdAt: new Date(),
      });

      await expect(createUser("jordan@example.com", "hashed-password")).rejects.toBeInstanceOf(
        DuplicateEmailError,
      );
      expect(insertOne).not.toHaveBeenCalled();
    });

    it("throws DuplicateEmailError when insertOne hits a race-condition duplicate key error", async () => {
      findOne.mockResolvedValue(null);
      insertOne.mockRejectedValue(
        Object.assign(new Error("E11000 duplicate key error"), { code: 11000 }),
      );

      await expect(createUser("jordan@example.com", "hashed-password")).rejects.toBeInstanceOf(
        DuplicateEmailError,
      );
    });

    it("rethrows non-duplicate-key insert errors", async () => {
      findOne.mockResolvedValue(null);
      insertOne.mockRejectedValue(new Error("connection lost"));

      await expect(createUser("jordan@example.com", "hashed-password")).rejects.toThrow(
        "connection lost",
      );
    });
  });
});
