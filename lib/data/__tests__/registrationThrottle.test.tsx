export {};

const createIndex = jest.fn().mockResolvedValue("expiresAt_1");
const findOneAndUpdate = jest.fn();
const collection = jest.fn().mockReturnValue({ createIndex, findOneAndUpdate });
const getDb = jest.fn().mockResolvedValue({ collection });

jest.mock("@/lib/data/mongodb", () => ({ getDb }));

describe("registration throttle data boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createIndex.mockResolvedValue("expiresAt_1");
  });

  it("allows attempts through the shared limit and provisions a TTL index", async () => {
    findOneAndUpdate.mockResolvedValue({
      _id: "hashed-client",
      count: 10,
      windowStartedAt: new Date("2026-08-17T00:00:00.000Z"),
      expiresAt: new Date("2026-08-17T00:15:00.000Z"),
    });
    const { consumeRegistrationAttempt } = await import("@/lib/data/registrationThrottle");

    const result = await consumeRegistrationAttempt(
      "hashed-client",
      new Date("2026-08-17T00:05:00.000Z"),
    );

    expect(result).toEqual({ allowed: true, retryAfterSeconds: 600 });
    expect(createIndex).toHaveBeenCalledWith({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "hashed-client" },
      expect.any(Array),
      { upsert: true, returnDocument: "after" },
    );
  });

  it("blocks attempts over the shared limit", async () => {
    findOneAndUpdate.mockResolvedValue({
      _id: "hashed-client",
      count: 11,
      windowStartedAt: new Date("2026-08-17T00:00:00.000Z"),
      expiresAt: new Date("2026-08-17T00:15:00.000Z"),
    });
    const { consumeRegistrationAttempt } = await import("@/lib/data/registrationThrottle");

    await expect(
      consumeRegistrationAttempt("hashed-client", new Date("2026-08-17T00:14:30.000Z")),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 30 });
  });
});
