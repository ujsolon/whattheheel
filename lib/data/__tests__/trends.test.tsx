import { readFileSync } from "node:fs";

import { getTrends } from "@/lib/data/trends";

jest.mock("node:fs", () => ({ readFileSync: jest.fn() }));

const mockedReadFileSync = jest.mocked(readFileSync);

describe("getTrends", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleError.mockRestore();
  });

  it("returns valid trends", () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([
        {
          id: "loafer",
          label: "Loafer",
          shoeImageUrl: "/trends/loafer.png",
          buyUrl: null,
        },
      ]),
    );

    expect(getTrends()).toHaveLength(1);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each(["{}", "not json"])("returns an empty collection for invalid seed %s", (seed) => {
    mockedReadFileSync.mockReturnValue(seed);

    expect(getTrends()).toEqual([]);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("returns an empty collection when the seed cannot be read", () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("missing");
    });

    expect(getTrends()).toEqual([]);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("skips invalid and duplicate entries deterministically", () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([
        {
          id: "runner",
          label: "Runner",
          shoeImageUrl: "/trends/runner.png",
          buyUrl: null,
        },
        {
          id: "runner",
          label: "Duplicate",
          shoeImageUrl: "/trends/duplicate.png",
          buyUrl: null,
        },
        { id: "broken" },
      ]),
    );

    expect(getTrends()).toEqual([
      {
        id: "runner",
        label: "Runner",
        shoeImageUrl: "/trends/runner.png",
        buyUrl: null,
      },
    ]);
  });
});
