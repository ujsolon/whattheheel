const connect = jest.fn();
const MockMongoClient = jest.fn().mockImplementation(() => ({ connect, db: jest.fn() }));

jest.mock("mongodb", () => ({
  MongoClient: MockMongoClient,
}));

describe("getDb", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    connect.mockReset();
    MockMongoClient.mockClear();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throws a clear error when MONGODB_URI is missing", async () => {
    delete process.env.MONGODB_URI;
    process.env.MONGODB_DB_NAME = "whattheheel_dev";

    const { getDb } = await import("@/lib/data/mongodb");

    await expect(getDb()).rejects.toThrow("MONGODB_URI");
  });

  it("throws a clear error when MONGODB_DB_NAME is missing", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    delete process.env.MONGODB_DB_NAME;

    const { getDb } = await import("@/lib/data/mongodb");

    await expect(getDb()).rejects.toThrow("MONGODB_DB_NAME");
  });

  it("connects once and reuses the same client across repeated calls", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    process.env.MONGODB_DB_NAME = "whattheheel_dev";
    connect.mockResolvedValue({ db: jest.fn().mockReturnValue("fake-db") });

    const { getDb } = await import("@/lib/data/mongodb");

    await getDb();
    await getDb();

    expect(MockMongoClient).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("retries after a transient connection rejection", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    process.env.MONGODB_DB_NAME = "whattheheel_dev";
    connect
      .mockRejectedValueOnce(new Error("temporary outage"))
      .mockResolvedValueOnce({ db: jest.fn().mockReturnValue("recovered-db") });

    const { getDb } = await import("@/lib/data/mongodb");

    await expect(getDb()).rejects.toThrow("temporary outage");
    await expect(getDb()).resolves.toBe("recovered-db");
    expect(MockMongoClient).toHaveBeenCalledTimes(2);
  });

  it("selects the database using MONGODB_DB_NAME", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    process.env.MONGODB_DB_NAME = "whattheheel_dev";
    const db = jest.fn().mockReturnValue("fake-db");
    connect.mockResolvedValue({ db });

    const { getDb } = await import("@/lib/data/mongodb");
    const result = await getDb();

    expect(db).toHaveBeenCalledWith("whattheheel_dev");
    expect(result).toBe("fake-db");
  });
});
