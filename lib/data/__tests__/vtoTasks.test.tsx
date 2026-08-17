/** @jest-environment node */
export {};

const createIndex = jest.fn().mockResolvedValue("taskId_1");
const insertOne = jest.fn();
const findOne = jest.fn();
const updateOne = jest.fn();
const taskCollection = { createIndex, insertOne, findOne, updateOne };
const collection = jest.fn(() => taskCollection);
jest.mock("@/lib/data/mongodb", () => ({ getDb: jest.fn(async () => ({ collection })) }));

const baseDoc = {
  taskId: "task-1",
  userId: "user-1",
  status: "pending" as const,
  srcUrl: "https://example.test/selfie.jpg",
  refUrl: "https://example.test/shoe.png",
  style: "random",
  gender: "female" as const,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("vtoTasks repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    createIndex.mockResolvedValue("taskId_1");
  });

  it("uses one uniquely indexed vto_tasks collection", async () => {
    findOne.mockResolvedValue(null);
    const { findTaskById } = await import("@/lib/data/vtoTasks");

    await findTaskById("task-1");
    await findTaskById("task-1");

    expect(collection).toHaveBeenCalledWith("vto_tasks");
    expect(createIndex).toHaveBeenCalledTimes(1);
    expect(createIndex).toHaveBeenCalledWith({ taskId: 1 }, { unique: true });
  });

  it("creates a task document", async () => {
    insertOne.mockResolvedValue({ acknowledged: true });
    const { createTask } = await import("@/lib/data/vtoTasks");

    await createTask(baseDoc);

    expect(insertOne).toHaveBeenCalledWith(baseDoc);
  });

  it("finds a task by id, or returns null when absent", async () => {
    findOne.mockResolvedValueOnce(baseDoc);
    const { findTaskById } = await import("@/lib/data/vtoTasks");
    await expect(findTaskById("task-1")).resolves.toEqual(baseDoc);

    findOne.mockResolvedValueOnce(null);
    await expect(findTaskById("missing")).resolves.toBeNull();
  });

  it("updates a task's status and terminal fields", async () => {
    updateOne.mockResolvedValue({ acknowledged: true });
    const { updateTaskStatus } = await import("@/lib/data/vtoTasks");

    await updateTaskStatus("task-1", { status: "success", resultUrl: "https://cdn.test/result.jpg" });

    expect(updateOne).toHaveBeenCalledWith(
      { taskId: "task-1" },
      { $set: expect.objectContaining({ status: "success", resultUrl: "https://cdn.test/result.jpg", updatedAt: expect.any(Date) }) },
    );
  });
});
