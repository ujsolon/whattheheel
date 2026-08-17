/** @jest-environment node */
export {};

const createIndex = jest.fn().mockResolvedValue("userId_1");
const findOne = jest.fn();
const findOneAndUpdate = jest.fn();
const updateOne = jest.fn();
const profileCollection = { createIndex, findOne, findOneAndUpdate, updateOne };
const collection = jest.fn(() => profileCollection);
jest.mock("@/lib/data/mongodb", () => ({ getDb: jest.fn(async () => ({ collection })) }));

describe("userProfiles repository", () => {
  beforeEach(() => { jest.clearAllMocks(); jest.resetModules(); createIndex.mockResolvedValue("userId_1"); });
  it("uses one uniquely indexed user_profiles collection", async () => {
    findOne.mockResolvedValue(null);
    const { findProfile } = await import("@/lib/data/userProfiles");
    await findProfile("user-1"); await findProfile("user-1");
    expect(collection).toHaveBeenCalledWith("user_profiles");
    expect(createIndex).toHaveBeenCalledTimes(1);
    expect(createIndex).toHaveBeenCalledWith({ userId: 1 }, { unique: true });
  });
  it("performs a versioned CAS and queues the displaced asset", async () => {
    const prior = { userId: "user-1", selfieUrl: "old", selfiePublicId: "old-id", assetVersion: 2, width: 512, height: 512, format: "jpeg" as const, bytes: 12, pendingCleanupPublicIds: ["older-id"], createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-02") };
    findOneAndUpdate.mockImplementation(async (_filter, update) => update.$set);
    const { replaceProfile } = await import("@/lib/data/userProfiles");
    const result = await replaceProfile("user-1", prior, { userId: "user-1", selfieUrl: "new", selfiePublicId: "new-id", width: 600, height: 600, format: "png", bytes: 20 });
    expect(findOneAndUpdate).toHaveBeenCalledWith({ userId: "user-1", selfiePublicId: "old-id", assetVersion: 2 }, expect.anything(), expect.objectContaining({ upsert: false }));
    expect(result).toMatchObject({ assetVersion: 3, pendingCleanupPublicIds: ["older-id", "old-id"], createdAt: prior.createdAt });
    expect(result).not.toHaveProperty("buffer");
  });
  it("maps a duplicate first-write race to a CAS miss", async () => {
    findOneAndUpdate.mockRejectedValue(Object.assign(new Error("duplicate"), { code: 11000 }));
    const { replaceProfile } = await import("@/lib/data/userProfiles");
    await expect(replaceProfile("user-1", null, { userId: "user-1", selfieUrl: "new", selfiePublicId: "new-id", width: 600, height: 600, format: "png", bytes: 20 })).resolves.toBeNull();
  });
  it("sets a gender preference via a plain update, not the CAS path", async () => {
    updateOne.mockResolvedValue({ acknowledged: true });
    const { setGenderPreference } = await import("@/lib/data/userProfiles");
    await setGenderPreference("user-1", "female");
    expect(updateOne).toHaveBeenCalledWith({ userId: "user-1" }, { $set: { gender: "female" } });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });
});
